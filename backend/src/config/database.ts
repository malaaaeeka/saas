import { PrismaClient } from '@prisma/client'
import logger from '../utils/logger'

const prisma = new PrismaClient({
  log: ['error', 'warn']
})

export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect()
    logger.info('Database connected successfully')
  } catch (error) {
    logger.error('Database connection failed:', error)
    process.exit(1)
  }
}

export default prisma