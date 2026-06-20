import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { requireAdmin } from '../middleware/role.middleware'
import {
  getDashboard,
  getUsers,
  blockUser,
  unblockUser,
  getCAPartners,
  getRevenue,
  getInvoices,
  getAuditLogs
} from '../controllers/admin.controller'

const router = Router()

// Apply authentication and admin role check to all routes
router.use(authenticate, requireAdmin)

router.get('/dashboard', getDashboard)
router.get('/users', getUsers)
router.post('/users/:id/block', blockUser)
router.post('/users/:id/unblock', unblockUser)
router.get('/ca-partners', getCAPartners)
router.get('/revenue', getRevenue)
router.get('/invoices', getInvoices)
router.get('/audit-logs', getAuditLogs)

export default router