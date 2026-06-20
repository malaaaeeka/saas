import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { requireCA } from '../middleware/role.middleware'
import {
  getDashboard,
  getMyClients,
  getCommission,
  getClientInvoices
} from '../controllers/ca.controller'

const router = Router()

// Apply authentication and CA role check to all routes
router.use(authenticate, requireCA)

router.get('/dashboard', getDashboard)
router.get('/clients', getMyClients)
router.get('/commission', getCommission)
router.get('/client/:clientId/invoices', getClientInvoices)

export default router