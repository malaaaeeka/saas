import { Router } from 'express'
import { searchBuyers, createBuyer, getAllBuyers } from '../controllers/buyer.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.get('/search', authenticate, searchBuyers)
router.get('/', authenticate, getAllBuyers)
router.post('/', authenticate, createBuyer)

export default router