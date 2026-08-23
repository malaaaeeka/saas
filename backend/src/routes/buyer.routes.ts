


import { Router } from 'express'
import { searchBuyers, createBuyer, getAllBuyers, getBuyerById, updateBuyer, deleteBuyer, bulkCreateBuyers, exportBuyersPDF } from '../controllers/buyer.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.get('/search', authenticate, searchBuyers)
router.get('/export', authenticate, exportBuyersPDF)
router.get('/', authenticate, getAllBuyers)
router.post('/', authenticate, createBuyer)
router.post('/bulk', authenticate, bulkCreateBuyers)
router.get('/:id', authenticate, getBuyerById)
router.put('/:id', authenticate, updateBuyer)
router.delete('/:id', authenticate, deleteBuyer)

export default router