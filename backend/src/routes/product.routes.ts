import { Router } from 'express'
import { searchProducts } from '../controllers/product.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.get('/search', authenticate, searchProducts)

export default router