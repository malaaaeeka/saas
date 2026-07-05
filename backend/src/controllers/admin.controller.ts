import { Request, Response } from 'express'
import prisma from '../config/database'
import { sendSuccess, sendError, sendPaginated } from '../utils/response'

export interface AuthRequest extends Request {
  user?: any
}

// GET /api/admin/dashboard
export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalUsers = await prisma.user.count()
    const totalInvoices = await prisma.invoice.count()
    const totalRevenue = await prisma.invoice.aggregate({
      _sum: { totalAmount: true }
    })
    const totalTax = await prisma.invoice.aggregate({
      _sum: { totalSalesTax: true }
    })
    const totalCAs = await prisma.user.count({
      where: { role: 'CA_PARTNER' }
    })

    const revenueThisMonth = await prisma.invoice.aggregate({
      _sum: { totalAmount: true },
      where: {
        createdAt: {
          gte: new Date(new Date().setDate(1))
        }
      }
    })

    sendSuccess(
      res,
      {
        totalUsers,
        totalInvoices,
        totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
        totalTax: Number(totalTax._sum.totalSalesTax || 0),
        totalCAs,
        revenueThisMonth: Number(revenueThisMonth._sum.totalAmount || 0)
      },
      'Dashboard data retrieved'
    )
  } catch (error: any) {
    sendError(res, error.message, 500)
  }
}

// GET /api/admin/users
export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, role } = req.query

    const skip = (Number(page) - 1) * Number(limit)
    const where: any = {}

    if (role) {
      where.role = role
    }

    const users = await prisma.user.findMany({
      skip,
      take: Number(limit),
      where,
      include: {
        business: true,
        caProfile: true
      },
      orderBy: { createdAt: 'desc' }
    })

    const total = await prisma.user.count({ where })

    sendPaginated(
      res,
      users,
      total,
      Number(page),
      Number(limit),
      'Users retrieved'
    )
  } catch (error: any) {
    sendError(res, error.message, 500)
  }
}

// POST /api/admin/users/:id/block
export const blockUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const user = await prisma.user.update({
      where: { id },
      data: { isVerified: false }
    })

    // Log to audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'BLOCK_USER',
        entity: 'User',
        entityId: id,
        details: { blockedBy: req.user.email }
      }
    })

    sendSuccess(res, user, 'User blocked successfully')
  } catch (error: any) {
    sendError(res, error.message, 500)
  }
}

// POST /api/admin/users/:id/unblock
export const unblockUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const user = await prisma.user.update({
      where: { id },
      data: { isVerified: true }
    })

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UNBLOCK_USER',
        entity: 'User',
        entityId: id
      }
    })

    sendSuccess(res, user, 'User unblocked successfully')
  } catch (error: any) {
    sendError(res, error.message, 500)
  }
}

// GET /api/admin/ca-partners
export const getCAPartners = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10 } = req.query

    const skip = (Number(page) - 1) * Number(limit)

    const cas = await prisma.cAProfile.findMany({
      skip,
      take: Number(limit),
      include: {
        user: {
          select: { email: true, createdAt: true }
        },
        clients: {
          select: { id: true, businessName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const total = await prisma.cAProfile.count()

    const casWithStats = cas.map(ca => ({
      ...ca,
      clientCount: ca.clients.length,
      commissionEarned: ca.commissionPct // You can calculate actual earnings later
    }))

    sendPaginated(
      res,
      casWithStats,
      total,
      Number(page),
      Number(limit),
      'CA partners retrieved'
    )
  } catch (error: any) {
    sendError(res, error.message, 500)
  }
}

// GET /api/admin/revenue
export const getRevenue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalRevenue = await prisma.invoice.aggregate({
      _sum: { totalAmount: true }
    })

    const totalTax = await prisma.invoice.aggregate({
      _sum: { totalSalesTax: true }
    })

    const invoicesByStatus = await prisma.invoice.groupBy({
      by: ['status'],
      _count: true
    })

    const caEarnings = await prisma.cAProfile.findMany({
      select: {
        id: true,
        firmName: true,
        commissionPct: true,
        user: {
          select: { email: true }
        },
        clients: true
      }
    })

    sendSuccess(
      res,
      {
        totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
        totalTax: Number(totalTax._sum.totalSalesTax || 0),
        invoicesByStatus,
        caEarnings
      },
      'Revenue data retrieved'
    )
  } catch (error: any) {
    sendError(res, error.message, 500)
  }
}

// GET /api/admin/users/counts
export const getUserCounts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [roleCounts, total] = await Promise.all([
      prisma.user.groupBy({
        by: ['role'],
        _count: { _all: true }
      }),
      prisma.user.count()
    ])

    const byRole: Record<string, number> = {}
    roleCounts.forEach(r => { byRole[r.role] = r._count._all })

    sendSuccess(res, { total, byRole }, 'User counts retrieved')
  } catch (error: any) {
    sendError(res, error.message, 500)
  }
}

// GET /api/admin/invoices/counts
export const getAdminInvoiceCounts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [statusCounts, total] = await Promise.all([
      prisma.invoice.groupBy({
        by: ['status'],
        _count: { _all: true }
      }),
      prisma.invoice.count()
    ])

    const byStatus: Record<string, number> = {}
    statusCounts.forEach(s => { byStatus[s.status] = s._count._all })

    sendSuccess(res, { total, byStatus }, 'Invoice counts retrieved')
  } catch (error: any) {
    sendError(res, error.message, 500)
  }
}


// GET /api/admin/invoices
export const getInvoices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, status } = req.query

    const skip = (Number(page) - 1) * Number(limit)
    const where: any = {}

    if (status) {
      where.status = status
    }

    const invoices = await prisma.invoice.findMany({
      skip,
      take: Number(limit),
      where,
      include: {
        business: {
          select: { businessName: true, ntn: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const total = await prisma.invoice.count({ where })

    sendPaginated(
      res,
      invoices,
      total,
      Number(page),
      Number(limit),
      'Invoices retrieved'
    )
  } catch (error: any) {
    sendError(res, error.message, 500)
  }
}

// GET /api/admin/audit-logs
export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20 } = req.query

    const skip = (Number(page) - 1) * Number(limit)

    const logs = await prisma.auditLog.findMany({
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' }
    })

    const total = await prisma.auditLog.count()

    sendPaginated(
      res,
      logs,
      total,
      Number(page),
      Number(limit),
      'Audit logs retrieved'
    )
  } catch (error: any) {
    sendError(res, error.message, 500)
  }
}