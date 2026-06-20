import { Router } from 'express'
import { searchHsCodes } from '../controllers/hsCode.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.get('/search', authenticate, searchHsCodes)

export default router