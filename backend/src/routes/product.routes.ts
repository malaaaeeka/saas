import { Router } from 'express'
import {
  searchProducts,
  getAllProducts,
  getProductById,
  createProduct,
  bulkCreateProducts,
  updateProduct,
  deleteProduct,
  startExportProductsPDF,
  getProductExportJobStatus,
  downloadProductExportJob
} from '../controllers/product.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

// '/search', '/bulk', and '/export' must come before '/:id' so they aren't swallowed by the :id param
router.get('/search', authenticate, searchProducts)
router.post('/export', authenticate, startExportProductsPDF)
router.get('/export/:jobId/status', authenticate, getProductExportJobStatus)
router.get('/export/:jobId/download', authenticate, downloadProductExportJob)
router.get('/', authenticate, getAllProducts)
router.post('/', authenticate, createProduct)
router.post('/bulk', authenticate, bulkCreateProducts)
router.get('/:id', authenticate, getProductById)
router.put('/:id', authenticate, updateProduct)
router.delete('/:id', authenticate, deleteProduct)

export default router