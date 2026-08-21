import { Router } from 'express'
import {
  searchProducts,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/product.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

// '/search' must come before '/:id' so it isn't swallowed by the :id param
router.get('/search', authenticate, searchProducts)
router.get('/', authenticate, getAllProducts)
router.post('/', authenticate, createProduct)
router.get('/:id', authenticate, getProductById)
router.put('/:id', authenticate, updateProduct)
router.delete('/:id', authenticate, deleteProduct)

export default router