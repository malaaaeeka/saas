import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import prisma from '../config/database'
import { sendSuccess, sendError } from '../utils/response'
import { processProductExport } from '../services/exportJob.service'

export const searchProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { q } = req.query
    const businessId = req.user?.business?.id

    if (!businessId) {
      sendError(res, 'No business profile found for this user', 401)
      return
    }

    if (!q || String(q).trim().length < 2) {
      sendError(res, 'Search query must be at least 2 characters', 400)
      return
    }

    const results = await prisma.product.findMany({
      where: {
        businessId,
        description: { contains: String(q), mode: 'insensitive' }
      },
      take: 20,
      orderBy: { description: 'asc' }
    })

    sendSuccess(res, results)
  } catch (error) {
    sendError(res, 'Failed to search products', 500)
  }
}

export const getAllProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.business?.id
    const { q } = req.query

    if (!businessId) {
      sendError(res, 'No business profile found for this user', 401)
      return
    }

    const where: any = { businessId }
    if (q && String(q).trim().length > 0) {
      where.description = { contains: String(q), mode: 'insensitive' }
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { description: 'asc' }
    })

    sendSuccess(res, products)
  } catch (error) {
    sendError(res, 'Failed to fetch products', 500)
  }
}
export const startExportProductsPDF = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.business?.id
    if (!businessId) {
      sendError(res, 'No business profile found for this user', 401)
      return
    }

    const uom = req.query.uom as string | undefined
    const taxRate = req.query.taxRate as string | undefined

    const where: any = { businessId }
    if (uom && uom !== 'ALL') where.uom = uom
    if (taxRate && taxRate !== 'ALL') where.taxRate = taxRate

    const job = await prisma.exportJob.create({
      data: { businessId, type: 'products', status: 'PROCESSING' }
    })

    processProductExport(job.id, where)

    sendSuccess(res, { jobId: job.id }, 'Export started', 202)
  } catch (error: any) {
    sendError(res, error.message || 'Failed to start export', 500)
  }
}

export const getProductExportJobStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params
    const job = await prisma.exportJob.findUnique({
      where: { id: jobId },
      select: { id: true, status: true, error: true, type: true, businessId: true }
    })
    if (!job) { sendError(res, 'Export job not found', 404); return }
    sendSuccess(res, job)
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch export status', 500)
  }
}

export const downloadProductExportJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params
    const job = await prisma.exportJob.findUnique({ where: { id: jobId } })
    if (!job) { sendError(res, 'Export job not found', 404); return }
    if (job.status !== 'COMPLETED' || !job.fileData) {
      sendError(res, 'Export is not ready yet', 400)
      return
    }
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${job.filename || 'products.pdf'}"`)
    res.send(job.fileData)
  } catch (error: any) {
    sendError(res, error.message || 'Failed to download export', 500)
  }
}

export const getProductById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const businessId = req.user?.business?.id

    if (!businessId) {
      sendError(res, 'No business profile found for this user', 401)
      return
    }

    const product = await prisma.product.findUnique({ where: { id } })
    if (!product || product.businessId !== businessId) {
      sendError(res, 'Product not found', 404)
      return
    }

    sendSuccess(res, product)
  } catch (error) {
    sendError(res, 'Failed to fetch product', 500)
  }
}

export const createProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.business?.id
    const { description, hsCode, hsCodeDescription, uom, rate, taxRate, sroSchedule, itemSNo } = req.body

    if (!businessId) {
      sendError(res, 'No business profile found for this user', 401)
      return
    }

    if (!description || !description.trim()) {
      sendError(res, 'Product description is required', 400)
      return
    }

    const product = await prisma.product.create({
      data: {
        businessId,
        description: description.trim(),
        hsCode: hsCode || null,
        hsCodeDescription: hsCodeDescription || null,
        uom: uom || null,
        rate: rate || null,
        taxRate: taxRate || null,
        sroSchedule: sroSchedule || null,
        itemSNo: itemSNo || null
      }
    })

    sendSuccess(res, product)
  } catch (error: any) {
    if (error.code === 'P2002') {
      sendError(res, 'A product with this description already exists', 409)
      return
    }
    sendError(res, 'Failed to create product', 500)
  }
}

export const bulkCreateProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.business?.id
    const { products } = req.body

    if (!businessId) {
      sendError(res, 'No business profile found for this user', 401)
      return
    }

    if (!Array.isArray(products) || products.length === 0) {
      sendError(res, 'No products provided', 400)
      return
    }

    const results: { description: string; status: 'SUCCESS' | 'FAILED'; error?: string }[] = []

    for (const p of products) {
      const { description, hsCode, hsCodeDescription, uom, rate, taxRate, sroSchedule, itemSNo } = p

      if (!description || !description.trim()) {
        results.push({ description: description || '(blank)', status: 'FAILED', error: 'Product description is required' })
        continue
      }

      try {
        await prisma.product.create({
          data: {
            businessId,
            description: description.trim(),
            hsCode: hsCode || null,
            hsCodeDescription: hsCodeDescription || null,
            uom: uom || null,
            rate: rate || null,
            taxRate: taxRate || null,
            sroSchedule: sroSchedule || null,
            itemSNo: itemSNo || null
          }
        })
        results.push({ description, status: 'SUCCESS' })
      } catch (error: any) {
        if (error.code === 'P2002') {
          results.push({ description, status: 'FAILED', error: 'A product with this description already exists' })
        } else {
          results.push({ description, status: 'FAILED', error: 'Failed to create product' })
        }
      }
    }

    sendSuccess(res, { results })
  } catch (error) {
    sendError(res, 'Failed to process bulk product upload', 500)
  }
}

export const updateProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const businessId = req.user?.business?.id
    const { description, hsCode, hsCodeDescription, uom, rate, taxRate, sroSchedule, itemSNo } = req.body

    if (!businessId) {
      sendError(res, 'No business profile found for this user', 401)
      return
    }

    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing || existing.businessId !== businessId) {
      sendError(res, 'Product not found', 404)
      return
    }

    if (!description || !description.trim()) {
      sendError(res, 'Product description is required', 400)
      return
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        description: description.trim(),
        hsCode: hsCode || null,
        hsCodeDescription: hsCodeDescription || null,
        uom: uom || null,
        rate: rate || null,
        taxRate: taxRate || null,
        sroSchedule: sroSchedule || null,
        itemSNo: itemSNo || null
      }
    })

    sendSuccess(res, product)
  } catch (error: any) {
    if (error.code === 'P2002') {
      sendError(res, 'A product with this description already exists', 409)
      return
    }
    sendError(res, 'Failed to update product', 500)
  }
}

export const deleteProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const businessId = req.user?.business?.id

    if (!businessId) {
      sendError(res, 'No business profile found for this user', 401)
      return
    }

    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing || existing.businessId !== businessId) {
      sendError(res, 'Product not found', 404)
      return
    }

    await prisma.product.delete({ where: { id } })
    sendSuccess(res, null, 'Product deleted successfully')
  } catch (error) {
    sendError(res, 'Failed to delete product', 500)
  }
}