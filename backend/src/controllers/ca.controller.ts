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
export const getClientInvoices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params
    const { page = 1, limit = 10 } = req.query

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

    const invoices = await prisma.invoice.findMany({
      skip,
      take: Number(limit),
      where: { businessId: clientId },
      orderBy: { createdAt: 'desc' }
    })

    const total = await prisma.invoice.count({ where: { businessId: clientId } })

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