import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../config/database'
import { sendError } from '../utils/response'

export interface AuthRequest extends Request {
  user?: any
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'No token provided', 401)
      return
    }

    const token = authHeader.split(' ')[1]

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'secret'
    ) as any

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        business: true,
        caProfile: true
      }
    })

    if (!user) {
      sendError(res, 'User not found', 401)
      return
    }

    req.user = user
    next()

  } catch (error) {
    sendError(res, 'Invalid token', 401)
  }
}