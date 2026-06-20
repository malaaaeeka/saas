import { Request, Response, NextFunction } from 'express'
import { sendError } from '../utils/response'

export interface AuthRequest extends Request {
  user?: any
}

// Check if user has required role(s)
export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401)
      return
    }

    if (!roles.includes(req.user.role)) {
      sendError(res, 'Access denied. Insufficient permissions', 403)
      return
    }

    next()
  }
}

// Shortcut middleware
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  requireRole(['SUPER_ADMIN'])(req, res, next)
}

export const requireCA = (req: AuthRequest, res: Response, next: NextFunction): void => {
  requireRole(['CA_PARTNER'])(req, res, next)
}

export const requireBusiness = (req: AuthRequest, res: Response, next: NextFunction): void => {
  requireRole(['BUSINESS', 'BUSINESS_STAFF'])(req, res, next)
}