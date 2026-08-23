import { Request, Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import prisma from '../config/database'
import { sendSuccess, sendError } from '../utils/response'
import { processBuyerExport } from '../services/exportJob.service'

export const searchBuyers = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const results = await prisma.buyer.findMany({
      where: {
        businessId,
        OR: [
          { buyerName: { contains: String(q), mode: 'insensitive' } },
          { buyerNtn:  { contains: String(q), mode: 'insensitive' } },
          { buyerCnic: { contains: String(q), mode: 'insensitive' } }
        ]
      },
      take: 20,
      orderBy: { buyerName: 'asc' }
    })

    sendSuccess(res, results)
  } catch (error) {
    sendError(res, 'Failed to search buyers', 500)
  }
}

export const createBuyer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.business?.id
    const { buyerName, buyerNtn, buyerCnic, buyerType, province, address, phone, email } = req.body

    if (!businessId) {
      sendError(res, 'No business profile found for this user', 401)
      return
    }

    if (!buyerName || !buyerName.trim()) {
      sendError(res, 'Buyer name is required', 400)
      return
    }

    if ((!buyerNtn || !buyerNtn.trim()) && (!buyerCnic || !buyerCnic.trim())) {
      sendError(res, 'A valid NTN or CNIC is required', 400)
      return
    }

    if (!buyerType || !buyerType.trim()) {
      sendError(res, 'Buyer type is required', 400)
      return
    }

    const buyer = await prisma.buyer.create({
      data: {
        businessId,
        buyerName,
        buyerNtn: buyerNtn || null,
        buyerCnic: buyerCnic || null,
        buyerType,
        province: province || null,
        address: address || null,
        phone: phone || null,
        email: email || null
      }
    })

    sendSuccess(res, buyer)
  } catch (error: any) {
    if (error.code === 'P2002') {
      sendError(res, 'A buyer with this NTN already exists', 409)
      return
    }
    sendError(res, 'Failed to create buyer', 500)
  }
}

export const bulkCreateBuyers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.business?.id
    const { buyers } = req.body

    if (!businessId) {
      sendError(res, 'No business profile found for this user', 401)
      return
    }

    if (!Array.isArray(buyers) || buyers.length === 0) {
      sendError(res, 'No buyers provided', 400)
      return
    }

    const results: { buyerName: string; status: 'SUCCESS' | 'FAILED'; error?: string }[] = []

    for (const b of buyers) {
      const { buyerName, buyerNtn, buyerCnic, buyerType, province, address, phone, email } = b

      if (!buyerName || !buyerName.trim()) {
        results.push({ buyerName: buyerName || '(blank)', status: 'FAILED', error: 'Buyer name is required' })
        continue
      }
      if ((!buyerNtn || !buyerNtn.trim()) && (!buyerCnic || !buyerCnic.trim())) {
        results.push({ buyerName, status: 'FAILED', error: 'A valid NTN or CNIC is required' })
        continue
      }
      if (!buyerType || !buyerType.trim()) {
        results.push({ buyerName, status: 'FAILED', error: 'Buyer type is required' })
        continue
      }

      try {
        await prisma.buyer.create({
          data: {
            businessId,
            buyerName,
            buyerNtn: buyerNtn || null,
            buyerCnic: buyerCnic || null,
            buyerType,
            province: province || null,
            address: address || null,
            phone: phone || null,
            email: email || null
          }
        })
        results.push({ buyerName, status: 'SUCCESS' })
      } catch (error: any) {
        if (error.code === 'P2002') {
          results.push({ buyerName, status: 'FAILED', error: 'A buyer with this NTN or CNIC already exists' })
        } else {
          results.push({ buyerName, status: 'FAILED', error: 'Failed to create buyer' })
        }
      }
    }

    sendSuccess(res, { results })
  } catch (error) {
    sendError(res, 'Failed to process bulk buyer upload', 500)
  }
}

export const getAllBuyers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.business?.id
    const { q } = req.query

    if (!businessId) {
      sendError(res, 'No business profile found for this user', 401)
      return
    }

    const where: any = { businessId }
    if (q && String(q).trim().length > 0) {
      where.OR = [
        { buyerName: { contains: String(q), mode: 'insensitive' } },
        { buyerNtn:  { contains: String(q), mode: 'insensitive' } },
        { buyerCnic: { contains: String(q), mode: 'insensitive' } }
      ]
    }

    const buyers = await prisma.buyer.findMany({
      where,
      orderBy: { buyerName: 'asc' }
    })

    sendSuccess(res, buyers)
  } catch (error) {
    sendError(res, 'Failed to fetch buyers', 500)
  }
}
export const startExportBuyersPDF = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.business?.id
    if (!businessId) {
      sendError(res, 'No business profile found for this user', 401)
      return
    }

    const type = req.query.type as string | undefined
    const province = req.query.province as string | undefined

    const where: any = { businessId }
    if (type && type !== 'ALL') where.buyerType = type
    if (province && province !== 'ALL') where.province = province

    const job = await prisma.exportJob.create({
      data: { businessId, type: 'buyers', status: 'PROCESSING' }
    })

    processBuyerExport(job.id, where)

    sendSuccess(res, { jobId: job.id }, 'Export started', 202)
  } catch (error: any) {
    sendError(res, error.message || 'Failed to start export', 500)
  }
}

export const getBuyerExportJobStatus = async (req: AuthRequest, res: Response): Promise<void> => {
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

export const downloadBuyerExportJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params
    const job = await prisma.exportJob.findUnique({ where: { id: jobId } })
    if (!job) { sendError(res, 'Export job not found', 404); return }
    if (job.status !== 'COMPLETED' || !job.fileData) {
      sendError(res, 'Export is not ready yet', 400)
      return
    }
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${job.filename || 'buyers.pdf'}"`)
    res.send(job.fileData)
  } catch (error: any) {
    sendError(res, error.message || 'Failed to download export', 500)
  }
}

export const updateBuyer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const businessId = req.user?.business?.id
    const { buyerName, buyerNtn, buyerCnic, buyerType, province, address, phone, email } = req.body

    if (!businessId) {
      sendError(res, 'No business profile found for this user', 401)
      return
    }

    const existing = await prisma.buyer.findUnique({ where: { id } })
    if (!existing || existing.businessId !== businessId) {
      sendError(res, 'Buyer not found', 404)
      return
    }

    if (!buyerName || !buyerName.trim()) {
      sendError(res, 'Buyer name is required', 400)
      return
    }

    if ((!buyerNtn || !buyerNtn.trim()) && (!buyerCnic || !buyerCnic.trim())) {
      sendError(res, 'A valid NTN or CNIC is required', 400)
      return
    }

    if (!buyerType || !buyerType.trim()) {
      sendError(res, 'Buyer type is required', 400)
      return
    }

    const buyer = await prisma.buyer.update({
      where: { id },
      data: {
        buyerName,
        buyerNtn: buyerNtn || null,
        buyerCnic: buyerCnic || null,
        buyerType,
        province: province || null,
        address: address || null,
        phone: phone || null,
        email: email || null
      }
    })

    sendSuccess(res, buyer)
  } catch (error: any) {
    if (error.code === 'P2002') {
      sendError(res, 'A buyer with this NTN or CNIC already exists', 409)
      return
    }
    sendError(res, 'Failed to update buyer', 500)
  }
}

export const deleteBuyer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const businessId = req.user?.business?.id

    if (!businessId) {
      sendError(res, 'No business profile found for this user', 401)
      return
    }

    const existing = await prisma.buyer.findUnique({ where: { id } })
    if (!existing || existing.businessId !== businessId) {
      sendError(res, 'Buyer not found', 404)
      return
    }

    const invoiceCount = await prisma.invoice.count({ where: { buyerId: id } })
    if (invoiceCount > 0) {
      sendError(res, `Cannot delete — this buyer has ${invoiceCount} invoice(s) linked to them`, 400)
      return
    }

    await prisma.buyer.delete({ where: { id } })
    sendSuccess(res, null, 'Buyer deleted successfully')
  } catch (error) {
    sendError(res, 'Failed to delete buyer', 500)
  }
}

export const getBuyerById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const businessId = req.user?.business?.id

    if (!businessId) {
      sendError(res, 'No business profile found for this user', 401)
      return
    }

    const buyer = await prisma.buyer.findUnique({ where: { id } })
    if (!buyer || buyer.businessId !== businessId) {
      sendError(res, 'Buyer not found', 404)
      return
    }

    sendSuccess(res, buyer)
  } catch (error) {
    sendError(res, 'Failed to fetch buyer', 500)
  }
}