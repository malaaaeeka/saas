import { Request, Response } from 'express'
import prisma from '../config/database'
import { sendSuccess, sendError, sendPaginated } from '../utils/response'

export interface AuthRequest extends Request {
  user?: any
}

// GET /api/ca/dashboard
export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const caProfile = await prisma.cAProfile.findUnique({
      where: { userId: req.user.id },
      include: {
        clients: true
      }
    })

    if (!caProfile) {
      sendError(res, 'CA profile not found', 404)
      return
    }

    const clientCount = caProfile.clients.length

    const totalInvoices = await prisma.invoice.count({
      where: {
        business: {
          caId: caProfile.id
        }
      }
    })

    const totalRevenue = await prisma.invoice.aggregate({
      _sum: { totalAmount: true },
      where: {
        business: {
          caId: caProfile.id
        }
      }
    })
sendSuccess(
  res,
  {
    firmName: caProfile.firmName,
    icapNumber: caProfile.icapNumber,
    referralCode: caProfile.referralCode,
    commissionRate: caProfile.commissionPct,
    clientCount,
    totalInvoices,
    clientRevenue: Number(totalRevenue._sum.totalAmount || 0),
    myEarnings: Number(totalRevenue._sum.totalAmount || 0) * (caProfile.commissionPct / 100)
  },
  'CA Dashboard data retrieved'
)
  } catch (error: any) {
    sendError(res, error.message, 500)
  }
}

// GET /api/ca/clients
export const getMyClients = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10 } = req.query

    const caProfile = await prisma.cAProfile.findUnique({
      where: { userId: req.user.id }
    })

    if (!caProfile) {
      sendError(res, 'CA profile not found', 404)
      return
    }

    const skip = (Number(page) - 1) * Number(limit)

    const clients = await prisma.business.findMany({
      skip,
      take: Number(limit),
      where: { caId: caProfile.id },
      include: {
        user: {
          select: { email: true, createdAt: true }
        },
        invoices: {
          select: { id: true, totalAmount: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const total = await prisma.business.count({
      where: { caId: caProfile.id }
    })

    const clientsWithStats = clients.map(client => ({
      ...client,
      invoiceCount: client.invoices.length,
      totalRevenue: client.invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0)
    }))

    sendPaginated(
      res,
      clientsWithStats,
      total,
      Number(page),
      Number(limit),
      'Your clients retrieved'
    )
  } catch (error: any) {
    sendError(res, error.message, 500)
  }
}

// GET /api/ca/commission
export const getCommission = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const caProfile = await prisma.cAProfile.findUnique({
      where: { userId: req.user.id }
    })

    if (!caProfile) {
      sendError(res, 'CA profile not found', 404)
      return
    }

    const totalClientRevenue = await prisma.invoice.aggregate({
      _sum: { totalAmount: true },
      where: {
        business: {
          caId: caProfile.id
        }
      }
    })

    const myEarnings = Number(totalClientRevenue._sum.totalAmount || 0) * (caProfile.commissionPct / 100)

    sendSuccess(
      res,
      {
        commissionPercentage: caProfile.commissionPct,
        totalClientRevenue: Number(totalClientRevenue._sum.totalAmount || 0),
        myEarnings,
        clientsCount: (await prisma.business.count({ where: { caId: caProfile.id } }))
      },
      'Commission data retrieved'
    )
  } catch (error: any) {
    sendError(res, error.message, 500)
  }
}

// GET /api/ca/client/:clientId/invoices
// GET /api/ca/client/:clientId/invoices
export const getClientInvoices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params
    const { page = 1, limit = 10, type, status, search } = req.query

    const caProfile = await prisma.cAProfile.findUnique({
      where: { userId: req.user.id }
    })

    if (!caProfile) {
      sendError(res, 'CA profile not found', 404)
      return
    }

    // Verify client belongs to this CA
    const client = await prisma.business.findUnique({
      where: { id: clientId }
    })

    if (!client || client.caId !== caProfile.id) {
      sendError(res, 'Client not found', 404)
      return
    }

    const skip = (Number(page) - 1) * Number(limit)

    const where: any = { businessId: clientId }

    if (type && type !== 'ALL') {
      where.invoiceType = type
    }

    if (status && status !== 'ALL') {
      where.status = status
    }

    if (search && String(search).trim().length > 0) {
      const q = String(search).trim()
      where.OR = [
        { buyerName: { contains: q, mode: 'insensitive' } },
        { fbrInvoiceNo: { contains: q, mode: 'insensitive' } },
        { id: { contains: q, mode: 'insensitive' } }
      ]
    }

    const invoices = await prisma.invoice.findMany({
      skip,
      take: Number(limit),
      where,
      orderBy: { createdAt: 'desc' }
    })

    const total = await prisma.invoice.count({ where })

    sendPaginated(
      res,
      invoices,
      total,
      Number(page),
      Number(limit),
      'Client invoices retrieved'
    )
  } catch (error: any) {
    sendError(res, error.message, 500)
  }
}
// GET /api/ca/client/:clientId/invoices/counts
export const getClientInvoiceCounts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params
    const { type, status } = req.query

    const caProfile = await prisma.cAProfile.findUnique({
      where: { userId: req.user.id }
    })

    if (!caProfile) {
      sendError(res, 'CA profile not found', 404)
      return
    }

    const client = await prisma.business.findUnique({
      where: { id: clientId }
    })

    if (!client || client.caId !== caProfile.id) {
      sendError(res, 'Client not found', 404)
      return
    }

    // totalForType: count of all this client's invoices matching the current status filter (ignoring type)
    const statusWhere: any = { businessId: clientId }
    if (status && status !== 'ALL') statusWhere.status = status

    // totalForStatus: count of all this client's invoices matching the current type filter (ignoring status)
    const typeWhere: any = { businessId: clientId }
    if (type && type !== 'ALL') typeWhere.invoiceType = type

    const [totalForType, totalForStatus, byTypeRaw, byStatusRaw] = await Promise.all([
      prisma.invoice.count({ where: statusWhere }),
      prisma.invoice.count({ where: typeWhere }),
      prisma.invoice.groupBy({
        by: ['invoiceType'],
        where: statusWhere,
        _count: { _all: true }
      }),
      prisma.invoice.groupBy({
        by: ['status'],
        where: typeWhere,
        _count: { _all: true }
      })
    ])

    const byType: Record<string, number> = {}
    byTypeRaw.forEach(row => { byType[row.invoiceType] = row._count._all })

    const byStatus: Record<string, number> = {}
    byStatusRaw.forEach(row => { byStatus[row.status] = row._count._all })

    sendSuccess(
      res,
      { totalForType, totalForStatus, byType, byStatus },
      'Client invoice counts retrieved'
    )
  } catch (error: any) {
    sendError(res, error.message, 500)
  }
}

// GET /api/ca/client/:clientId
export const getClientDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params

    const caProfile = await prisma.cAProfile.findUnique({
      where: { userId: req.user.id }
    })

    if (!caProfile) {
      sendError(res, 'CA profile not found', 404)
      return
    }

    const client = await prisma.business.findUnique({
      where: { id: clientId },
      include: {
        user: { select: { email: true, createdAt: true } }
      }
    })

    if (!client || client.caId !== caProfile.id) {
      sendError(res, 'Client not found', 404)
      return
    }

    sendSuccess(res, client, 'Client details retrieved')
  } catch (error: any) {
    sendError(res, error.message, 500)
  }
}

// GET /api/ca/search-business?query=...
export const searchBusiness = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { query } = req.query
    if (!query || String(query).trim().length < 3) {
      sendError(res, 'Enter at least 3 characters to search', 400)
      return
    }

    const q = String(query).trim()

    const businesses = await prisma.business.findMany({
      where: {
        OR: [
          { ntn: { contains: q, mode: 'insensitive' } },
          { businessName: { contains: q, mode: 'insensitive' } },
          { user: { email: { contains: q, mode: 'insensitive' } } }
        ]
      },
      include: {
        user: { select: { email: true } }
      },
      take: 10
    })

    sendSuccess(res, businesses, 'Search results')
  } catch (error: any) {
    sendError(res, error.message, 500)
  }
}

// PUT /api/ca/assign-client/:businessId
export const assignClient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { businessId } = req.params

    const caProfile = await prisma.cAProfile.findUnique({ where: { userId: req.user.id } })
    if (!caProfile) {
      sendError(res, 'CA profile not found', 404)
      return
    }

    const business = await prisma.business.findUnique({ where: { id: businessId } })
    if (!business) {
      sendError(res, 'Business not found', 404)
      return
    }

    if (business.caId) {
      sendError(res, 'This business is already linked to a CA', 400)
      return
    }

    const updated = await prisma.business.update({
      where: { id: businessId },
      data: { caId: caProfile.id }
    })

    sendSuccess(res, updated, 'Business linked to your CA profile')
  } catch (error: any) {
    sendError(res, error.message, 500)
  }
}