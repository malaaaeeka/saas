import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { connectDatabase } from './config/database'
import logger from './utils/logger'

// Routes
import authRoutes from './routes/auth.routes'
import businessRoutes from './routes/business.routes'
import invoiceRoutes from './routes/invoice.routes'
import fbrRoutes from './routes/fbr.routes'
import caRoutes from './routes/ca.routes'
import adminRoutes from './routes/admin.routes'
import hsCodeRoutes from './routes/hsCode.routes'   // ← moved here, with other imports

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/business', businessRoutes)
app.use('/api/invoices', invoiceRoutes)
app.use('/api/fbr', fbrRoutes)
app.use('/api/ca', caRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/hs-codes', hsCodeRoutes)   // ← moved here, with other app.use lines

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  })
})

// Start server
const startServer = async () => {
  try {
    await connectDatabase()
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`)
      logger.info(`Environment: ${process.env.NODE_ENV}`)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()