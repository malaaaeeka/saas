import { Request, Response } from 'express'
import { sendSuccess } from '../utils/response'

export const getPaymentStatus = async (req: Request, res: Response): Promise<void> => {
  sendSuccess(res, null, 'Payment service coming soon')
}