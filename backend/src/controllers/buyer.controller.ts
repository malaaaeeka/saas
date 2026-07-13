import { Request, Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import prisma from '../config/database'
import { sendSuccess, sendError } from '../utils/response'

export const searchBuyers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { q } = req.query
    const businessId = req.user?.business?.id

    if (!businessId) {
      sendError(res, 'No business profile found for this user', 401)
      return
    }

    if (!q || String(q).trim().length < 2) {
      sendError(res, 'Search query must be at least 2 characters', 400)
      return
    }

    const results = await prisma.buyer.findMany({
      where: {
        businessId,
        OR: [
          { buyerName: { contains: String(q), mode: 'insensitive' } },
          { buyerNtn:  { contains: String(q), mode: 'insensitive' } },
          { buyerCnic: { contains: String(q), mode: 'insensitive' } }
        ]
      },
      take: 20,
      orderBy: { buyerName: 'asc' }
    })

    sendSuccess(res, results)
  } catch (error) {
    sendError(res, 'Failed to search buyers', 500)
  }
}

export const createBuyer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.business?.id
    const { buyerName, buyerNtn, buyerCnic, address, phone, email } = req.body

    if (!businessId) {
      sendError(res, 'No business profile found for this user', 401)
      return
    }

    if (!buyerName || !buyerName.trim()) {
      sendError(res, 'Buyer name is required', 400)
      return
    }

    const buyer = await prisma.buyer.create({
      data: { businessId, buyerName, buyerNtn, buyerCnic, address, phone, email }
    })

    sendSuccess(res, buyer)
  } catch (error: any) {
    if (error.code === 'P2002') {
      sendError(res, 'A buyer with this NTN already exists', 409)
      return
    }
    sendError(res, 'Failed to create buyer', 500)
  }
}