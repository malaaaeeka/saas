import { Router } from 'express'

import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  getInvoiceCounts,
  getStats,
  downloadInvoicePdf,
  submitToFBR,
   sendInvoiceEmail
} from '../controllers/invoice.controller'
import { authenticate } from '../middleware/auth.middleware'


const router = Router()

router.post('/', authenticate, createInvoice)
router.get('/', authenticate, getInvoices)
router.get('/counts', authenticate, getInvoiceCounts)
router.get('/stats', authenticate, getStats)
router.get('/:id', authenticate, getInvoiceById)
router.get('/:id/pdf', authenticate, downloadInvoicePdf)
router.post('/:id/submit-fbr', authenticate, submitToFBR)
router.post('/:id/send-email', authenticate, sendInvoiceEmail)

export default router