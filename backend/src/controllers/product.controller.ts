import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import prisma from '../config/database'
import { sendSuccess, sendError } from '../utils/response'
import PDFDocument from 'pdfkit'

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

export const exportProductsPDF = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const products = await prisma.product.findMany({
      where,
      orderBy: { description: 'asc' }
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="products.pdf"')

    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' })
    doc.pipe(res)

    doc.fontSize(16).font('Helvetica').fillColor('#141414').text('Products', 30, 30)
    doc.fillColor('black')

    const tableLeft = 30
    let tableTop = 60

    const cols = [
      { key: 'sr',       label: 'Serial No.',  w: 50  },
      { key: 'desc',     label: 'Description', w: 160 },
      { key: 'hsCode',   label: 'HS Code',     w: 60  },
      { key: 'uom',      label: 'UoM',         w: 45  },
      { key: 'rate',     label: 'Rate',        w: 75  },
      { key: 'taxRate',  label: 'Tax Rate',    w: 55  },
      { key: 'sro',      label: 'SRO',         w: 100 },
      { key: 'itemSNo',  label: 'Item S. No.', w: 75  },
    ]

    let runningX = tableLeft
    const colX: number[] = []
    cols.forEach(c => { colX.push(runningX); runningX += c.w })
    const tableWidth = runningX - tableLeft

    const drawHeader = (y: number) => {
      const headerHeight = 20
      doc.rect(tableLeft, y, tableWidth, headerHeight).fill('#e5e5e5')
      doc.fillColor('#141414')
      doc.fontSize(8).font('Helvetica-Bold')
      cols.forEach((c, i) => {
        doc.text(c.label, colX[i] + 4, y + 6, { width: c.w - 8 })
      })
      doc.fillColor('black')
      return y + headerHeight
    }

    tableTop = drawHeader(tableTop)
    doc.font('Helvetica').fontSize(7.5)

    products.forEach((p, idx) => {
      if (tableTop > doc.page.height - 60) {
        doc.addPage({ margin: 30, size: 'A4', layout: 'landscape' })
        tableTop = drawHeader(30)
        doc.font('Helvetica').fontSize(7.5)
      }

      const rowHeight = 18
      const rowY = tableTop

      if (idx % 2 === 0) {
        doc.rect(tableLeft, rowY, tableWidth, rowHeight).fill('#f5f5f5')
      }
      doc.fillColor('#505050')

      const valueMap: Record<string, string> = {
        sr: String(idx + 1),
        desc: p.description || '—',
        hsCode: p.hsCode || '—',
        uom: p.uom || '—',
        rate: p.rate !== null ? `PKR ${Number(p.rate).toFixed(2)}` : '—',
        taxRate: p.taxRate || '—',
        sro: p.sroSchedule || '—',
        itemSNo: p.itemSNo || '—'
      }

      cols.forEach((c, i) => {
        doc.text(valueMap[c.key], colX[i] + 4, rowY + 5, { width: c.w - 8 })
      })

      doc.fillColor('black')
      tableTop += rowHeight
    })

    doc.end()
  } catch (error) {
    sendError(res, 'Failed to export products PDF', 500)
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