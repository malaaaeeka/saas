import { Router } from 'express'
import {
  register,
  login,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword
} from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth.middleware'
import { authLimiter } from '../middleware/ratelimit.middleware'

const router = Router()

router.post('/register', authLimiter, register)
router.post('/login', authLimiter, login)
router.post('/forgot-password', authLimiter, forgotPassword)
router.post('/reset-password', resetPassword)
router.get('/me', authenticate, getMe)
router.put('/change-password', authenticate, changePassword)

export default router