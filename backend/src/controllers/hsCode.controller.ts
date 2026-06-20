import { Request, Response } from 'express'
import prisma from '../config/database'
import { sendSuccess, sendError } from '../utils/response'

export const searchHsCodes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query

    if (!q || String(q).trim().length < 2) {
      sendError(res, 'Search query must be at least 2 characters', 400)
      return
    }

    const results = await prisma.hsCode.findMany({
      where: {
        OR: [
          { code:        { contains: String(q), mode: 'insensitive' } },
          { description: { contains: String(q), mode: 'insensitive' } }
        ]
      },
      select: { code: true, description: true, fullEntry: true },
      take: 20,
      orderBy: { code: 'asc' }
    })

    sendSuccess(res, results)
  } catch (error) {
    sendError(res, 'Failed to search HS codes', 500)
  }
}