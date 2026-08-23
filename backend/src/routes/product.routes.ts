import { Router } from 'express'
import {
  searchProducts,
  getAllProducts,
  getProductById,
  createProduct,
  bulkCreateProducts,
  updateProduct,
  deleteProduct
} from '../controllers/product.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

// '/search' and '/bulk' must come before '/:id' so they aren't swallowed by the :id param
router.get('/search', authenticate, searchProducts)
router.get('/', authenticate, getAllProducts)
router.post('/', authenticate, createProduct)
router.post('/bulk', authenticate, bulkCreateProducts)
router.get('/:id', authenticate, getProductById)
router.put('/:id', authenticate, updateProduct)
router.delete('/:id', authenticate, deleteProduct)

export default router