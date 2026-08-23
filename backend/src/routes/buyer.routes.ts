


import { Router } from 'express'
import { searchBuyers, createBuyer, getAllBuyers, getBuyerById, updateBuyer, deleteBuyer, bulkCreateBuyers, startExportBuyersPDF, getBuyerExportJobStatus, downloadBuyerExportJob } from '../controllers/buyer.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.get('/search', authenticate, searchBuyers)
router.post('/export', authenticate, startExportBuyersPDF)
router.get('/export/:jobId/status', authenticate, getBuyerExportJobStatus)
router.get('/export/:jobId/download', authenticate, downloadBuyerExportJob)
router.get('/', authenticate, getAllBuyers)
router.post('/', authenticate, createBuyer)
router.post('/bulk', authenticate, bulkCreateBuyers)
router.get('/:id', authenticate, getBuyerById)
router.put('/:id', authenticate, updateBuyer)
router.delete('/:id', authenticate, deleteBuyer)

export default router