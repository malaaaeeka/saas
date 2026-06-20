import { Router } from 'express'
import {
  createBusinessProfile,
  getBusinessProfile,
  updateBusinessProfile,
  updateFBRToken,
  addBranch
} from '../controllers/business.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.post('/profile', authenticate, createBusinessProfile)
router.get('/profile', authenticate, getBusinessProfile)
router.put('/profile', authenticate, updateBusinessProfile)
router.put('/fbr-token', authenticate, updateFBRToken)
router.post('/branch', authenticate, addBranch)

export default router