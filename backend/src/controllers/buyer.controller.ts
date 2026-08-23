import { Request, Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import prisma from '../config/database'
import { sendSuccess, sendError } from '../utils/response'
import PDFDocument from 'pdfkit'

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
export const exportBuyersPDF = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const buyers = await prisma.buyer.findMany({
      where,
      orderBy: { buyerName: 'asc' }
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="buyers.pdf"')

    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' })
    doc.pipe(res)

    doc.fontSize(16).font('Helvetica-Bold').text('Buyers', 30, 30)
    doc.fontSize(9).font('Helvetica').fillColor('gray')
      .text(`${buyers.length} buyer${buyers.length === 1 ? '' : 's'} · Generated ${new Date().toLocaleDateString()}`, 30, 52)
    doc.fillColor('black')

    const tableLeft = 30
    let tableTop = 75

    const cols = [
      { key: 'sr',       label: 'Serial No.', w: 45  },
      { key: 'name',     label: 'Name',       w: 95  },
      { key: 'ntn',      label: 'NTN',        w: 60  },
      { key: 'cnic',     label: 'CNIC',       w: 80  },
      { key: 'type',     label: 'Type',       w: 80  },
      { key: 'province', label: 'Province',   w: 85  },
      { key: 'phone',    label: 'Phone',      w: 60  },
      { key: 'email',    label: 'Email',      w: 85  },
      { key: 'address',  label: 'Address',    w: 100 },
    ]

    let runningX = tableLeft
    const colX: number[] = []
    cols.forEach(c => { colX.push(runningX); runningX += c.w })
    const tableWidth = runningX - tableLeft

    const drawHeader = (y: number) => {
      const headerHeight = 20
      doc.rect(tableLeft, y, tableWidth, headerHeight).stroke()
      doc.fontSize(8).font('Helvetica-Bold')
      cols.forEach((c, i) => {
        doc.text(c.label, colX[i] + 4, y + 5, { width: c.w - 8 })
        doc.moveTo(colX[i], y).lineTo(colX[i], y + headerHeight).stroke()
      })
      doc.moveTo(tableLeft + tableWidth, y).lineTo(tableLeft + tableWidth, y + headerHeight).stroke()
      return y + headerHeight
    }

    tableTop = drawHeader(tableTop)
    doc.font('Helvetica').fontSize(7.5)

    buyers.forEach((b, idx) => {
      if (tableTop > doc.page.height - 60) {
        doc.addPage({ margin: 30, size: 'A4', layout: 'landscape' })
        tableTop = drawHeader(30)
        doc.font('Helvetica').fontSize(7.5)
      }

      const rowHeight = 18
      const rowY = tableTop

      const valueMap: Record<string, string> = {
        sr: String(idx + 1),
        name: b.buyerName || '—',
        ntn: b.buyerNtn || '—',
        cnic: b.buyerCnic || '—',
        type: b.buyerType || 'Unregistered',
        province: b.province || '—',
        phone: b.phone || '—',
        email: b.email || '—',
        address: b.address || '—'
      }

      cols.forEach((c, i) => {
        doc.rect(colX[i], rowY, c.w, rowHeight).stroke()
        doc.text(valueMap[c.key], colX[i] + 4, rowY + 5, { width: c.w - 8 })
      })

      tableTop += rowHeight
    })

    doc.end()
  } catch (error) {
    sendError(res, 'Failed to export buyers PDF', 500)
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