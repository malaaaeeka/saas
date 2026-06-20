import logger from '../utils/logger'

let redisClient: any = null

export const connectRedis = async (): Promise<void> => {
  try {
    logger.info('Redis connection skipped for now - will add later')
  } catch (error) {
    logger.error('Redis error:', error)
  }
}

export default redisClient