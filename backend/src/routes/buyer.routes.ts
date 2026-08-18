


import { Router } from 'express'
import { searchBuyers, createBuyer, getAllBuyers, updateBuyer, deleteBuyer } from '../controllers/buyer.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.get('/search', authenticate, searchBuyers)
router.get('/', authenticate, getAllBuyers)
router.post('/', authenticate, createBuyer)
router.put('/:id', authenticate, updateBuyer)
router.delete('/:id', authenticate, deleteBuyer)

export default router