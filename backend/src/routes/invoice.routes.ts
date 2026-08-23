import { Router } from 'express'

import {
  createInvoice,
  updateInvoice,
  getInvoices,
  getInvoiceById,
  getInvoiceCounts,
  getStats,
  downloadInvoicePdf,
  exportInvoicesPDF,
  submitToFBR,
  sendInvoiceEmail,
  deleteInvoice,
  bulkCreateInvoices,
  getBulkBatchStatus
} from '../controllers/invoice.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { invoiceSchema } from '../utils/validators'


const router = Router()

// Bulk routes — placed before '/:id' so '/bulk' isn't swallowed by the :id param
router.post('/bulk', authenticate, bulkCreateInvoices)
router.get('/bulk/:batchId', authenticate, getBulkBatchStatus)

router.post('/', authenticate, validate(invoiceSchema), createInvoice)
router.put('/:id', authenticate, validate(invoiceSchema), updateInvoice)
router.get('/', authenticate, getInvoices)
router.get('/counts', authenticate, getInvoiceCounts)
router.get('/stats', authenticate, getStats)
router.get('/export', authenticate, exportInvoicesPDF)
router.get('/:id', authenticate, getInvoiceById)
router.get('/:id/pdf', authenticate, downloadInvoicePdf)
router.post('/:id/submit-fbr', authenticate, submitToFBR)
router.post('/:id/send-email', authenticate, sendInvoiceEmail)
router.delete('/:id', authenticate, deleteInvoice)

export default router