import { Request, Response } from 'express'
import prisma from '../config/database'
import { sendSuccess, sendError, sendPaginated } from '../utils/response'
import PDFDocument from 'pdfkit'
import { generateQRCode, generateInvoiceQRData } from '../services/qr.service'
import fbrService from '../services/fbr.service'
import emailService from '../services/email.service'

export const generatePdfBuffer = async (invoice: any): Promise<Buffer> => {
  const qrData = generateInvoiceQRData(invoice)
  const qrBuffer = await generateQRCode(qrData)

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' })
    const chunks: Buffer[] = []

    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const isAmendment  = invoice.invoiceType === 'CREDIT_NOTE' || invoice.invoiceType === 'DEBIT_NOTE'
    const isCreditNote = invoice.invoiceType === 'CREDIT_NOTE'

    const titleMap: Record<string, string> = {
      SALE: 'Sale Invoice', PURCHASE: 'Purchase Invoice',
      CREDIT_NOTE: 'Credit Note', DEBIT_NOTE: 'Debit Note'
    }
    const title = titleMap[invoice.invoiceType] || 'Sale Invoice'

    const pageWidth = doc.page.width - 80 // usable width inside 40pt margins

    // ===== Header: Business name (left) + logo/QR block (right) =====
    doc.fontSize(16).font('Helvetica-Bold').text(invoice.business.businessName || 'N/A', 40, 40)
    doc.image(qrBuffer, doc.page.width - 130, 35, { width: 80, height: 80 })
    doc.fontSize(7).fillColor('gray')
      .text('Scan to verify', doc.page.width - 130, 117, { width: 80, align: 'center' })
    doc.fillColor('black')

    doc.moveDown(2)
    doc.moveTo(40, 130).lineTo(doc.page.width - 40, 130).stroke()

    // ===== Three-column info block: Seller | Buyer | Invoice Summary =====
    const colY = 145
    const col1 = 40
    const col2 = 300
    const col3 = 560

    doc.fontSize(10).font('Helvetica-Bold').text('Seller Information', col1, colY)
    doc.fontSize(9).font('Helvetica')
      .text('Business Name:', col1, colY + 16, { continued: true }).font('Helvetica-Bold')
      .text(`  ${invoice.business.businessName || 'N/A'}`)
    doc.font('Helvetica')
      .text('Registration No.:', col1, colY + 30, { continued: true }).font('Helvetica-Bold')
      .text(`  ${invoice.business.ntn || 'N/A'}`)
    doc.font('Helvetica')
      .text('Province:', col1, colY + 44, { continued: true }).font('Helvetica-Bold')
      .text(`  ${invoice.business.province || 'N/A'}`)

    doc.font('Helvetica-Bold').fontSize(10).text('Buyer Information', col2, colY)
    doc.fontSize(9).font('Helvetica')
      .text('Business Name:', col2, colY + 16, { continued: true }).font('Helvetica-Bold')
      .text(`  ${invoice.buyerName || 'Walk-in Customer'}`)
    doc.font('Helvetica')
      .text('Registration No.:', col2, colY + 30, { continued: true }).font('Helvetica-Bold')
      .text(`  ${invoice.buyerNtn || invoice.buyerCnic || 'N/A'}`)

    doc.font('Helvetica-Bold').fontSize(10).text('Invoice Summary', col3, colY)
    doc.fontSize(9).font('Helvetica')
      .text('FBR Invoice No.:', col3, colY + 16, { continued: true }).font('Helvetica-Bold')
      .text(`  ${invoice.fbrInvoiceNo || 'Not yet submitted'}`)
    doc.font('Helvetica')
      .text('Invoice Date:', col3, colY + 30, { continued: true }).font('Helvetica-Bold')
      .text(`  ${new Date(invoice.invoiceDate).toLocaleDateString()}`)
    doc.font('Helvetica')
      .text('Invoice Type:', col3, colY + 44, { continued: true }).font('Helvetica-Bold')
      .text(`  ${title}`)
    doc.font('Helvetica')
      .text('Status:', col3, colY + 58, { continued: true }).font('Helvetica-Bold')
      .text(`  ${invoice.status}`)

    if (isAmendment && invoice.amendmentReason) {
      doc.font('Helvetica').fontSize(8).fillColor('#555555')
        .text(`Amendment Reason: ${invoice.amendmentReason}`, col1, colY + 60)
      doc.fillColor('black')
    }

    // ===== Items table =====
    let tableTop = colY + 90
    doc.moveTo(40, tableTop).lineTo(doc.page.width - 40, tableTop).stroke()
    tableTop += 8

    // Column layout (landscape gives ~760pt usable width)
    const cols = [
      { key: 'sr',       label: 'Sr.',           x: 40,  w: 25  },
      { key: 'hsCode',    label: 'HS Code',       x: 65,  w: 55  },
      { key: 'desc',      label: 'Description',   x: 120, w: 160 },
      { key: 'saleType',  label: 'Sale Type',     x: 280, w: 90  },
      { key: 'qty',       label: 'Qty',           x: 370, w: 45  },
      { key: 'uom',       label: 'UoM',           x: 415, w: 40  },
      { key: 'rate',      label: 'Rate',          x: 455, w: 55  },
      { key: 'value',     label: 'Sales Value',   x: 510, w: 70  },
      { key: 'tax',       label: 'Sales Tax',     x: 580, w: 65  },
      { key: 'fed',       label: 'FED',           x: 645, w: 45  },
      { key: 'discount',  label: 'Discount',      x: 690, w: 55  },
      { key: 'sro',       label: 'SRO/Schedule',  x: 745, w: 90  },
    ]

    doc.fontSize(8).font('Helvetica-Bold')
    cols.forEach(c => doc.text(c.label, c.x, tableTop, { width: c.w }))
    tableTop += 14
    doc.moveTo(40, tableTop).lineTo(doc.page.width - 40, tableTop).stroke()
    tableTop += 6

    doc.font('Helvetica').fontSize(7.5)
    invoice.items.forEach((item: any, i: number) => {
      const qty    = isCreditNote ? Math.abs(Number(item.quantity))    : Number(item.quantity)
      const amount = isCreditNote ? Math.abs(Number(item.totalAmount)) : Number(item.totalAmount)
      const tax    = isCreditNote ? Math.abs(Number(item.salesTax))    : Number(item.salesTax)
      const fed    = Number(item.fed || 0)
      const discount = Number(item.discount || 0)

      const rowY = tableTop
      doc.text(String(i + 1),                          40,  rowY, { width: 25 })
      doc.text(item.hsCode || '—',                      65,  rowY, { width: 55 })
      doc.text(item.description || '—',                 120, rowY, { width: 160 })
      doc.text(invoice.saleType || '—',                 280, rowY, { width: 90 })
      doc.text(String(qty),                             370, rowY, { width: 45 })
      doc.text(item.uom || '—',                         415, rowY, { width: 40 })
      doc.text(Number(item.rate).toFixed(2),            455, rowY, { width: 55 })
      doc.text(amount.toFixed(2),                       510, rowY, { width: 70 })
      doc.text(tax.toFixed(2),                          580, rowY, { width: 65 })
      doc.text(fed.toFixed(2),                          645, rowY, { width: 45 })
      doc.text(discount.toFixed(2),                     690, rowY, { width: 55 })
      doc.text(item.sroSchedule || '—',                 745, rowY, { width: 90 })

      // advance tableTop by the tallest wrapped cell (description is usually tallest)
      const descHeight = doc.heightOfString(item.description || '—', { width: 160 })
      tableTop += Math.max(descHeight, 12) + 6
    })

    doc.moveTo(40, tableTop).lineTo(doc.page.width - 40, tableTop).stroke()
    tableTop += 10

    // ===== Totals row =====
    const subtotal   = isCreditNote ? Math.abs(Number(invoice.totalAmount))   : Number(invoice.totalAmount)
    const salesTax   = isCreditNote ? Math.abs(Number(invoice.totalSalesTax)) : Number(invoice.totalSalesTax)
    const fedTotal   = isCreditNote ? Math.abs(Number(invoice.totalFed))     : Number(invoice.totalFed)
    const discountTotal = Number(invoice.totalDiscount)
    const grandTotal = subtotal + salesTax + fedTotal - discountTotal

    doc.fontSize(9).font('Helvetica-Bold')
      .text(`Total Sales Value: PKR ${subtotal.toFixed(2)}`,   500, tableTop)
      .text(`Total Sales Tax: PKR ${salesTax.toFixed(2)}`,     500, tableTop + 14)
      .text(`Grand Total: PKR ${grandTotal.toFixed(2)}`,       500, tableTop + 32)

    doc.fontSize(7).font('Helvetica').fillColor('gray')
      .text('This is a computer generated document. Scan QR code to verify authenticity.', 40, doc.page.height - 50, { align: 'center', width: pageWidth })
    doc.fillColor('black')

    doc.end()
  })
}
export const createInvoice = async (req: any, res: Response): Promise<void> => {
  try {
    const { invoiceType, invoiceDate, buyerNtn, buyerCnic, buyerName, saleType, branchId, items, originalInvoiceId, amendmentReason } = req.body
    const business = await prisma.business.findUnique({ where: { userId: req.user.id } })
    if (!business) {
      sendError(res, 'Business profile not found. Please set up your profile first.', 404)
      return
    }
    const totalAmount = items.reduce((sum: number, item: any) => sum + Number(item.totalAmount), 0)
    const totalSalesTax = items.reduce((sum: number, item: any) => sum + Number(item.salesTax), 0)
    const totalFed = items.reduce((sum: number, item: any) => sum + Number(item.fed || 0), 0)
    const totalDiscount = items.reduce((sum: number, item: any) => sum + Number(item.discount || 0), 0)
    const invoice = await prisma.invoice.create({
      data: {
        businessId: business.id,
        branchId: branchId || null,
        invoiceType,
        invoiceDate: new Date(invoiceDate),
        originalInvoiceId: originalInvoiceId || null,
        amendmentReason: amendmentReason || null,
        buyerNtn,
        buyerCnic,
        buyerName,
        saleType,
        totalAmount,
        totalSalesTax,
        totalFed,
        totalDiscount,
        status: 'PENDING',
        items: {
          createMany: {
            data: items.map((item: any) => ({
              hsCode: item.hsCode,
              productCode: item.productCode,
              description: item.description,
              quantity: item.quantity,
              uom: item.uom,
              rate: item.rate,
              totalAmount: item.totalAmount,
              salesTax: item.salesTax,
              sroSchedule: item.sroSchedule,
              fed: item.fed || 0,
              withholdingTax: item.withholdingTax || 0,
              discount: item.discount || 0
            }))
          }
        }
      },
      include: { items: true }
    })
    // If this is an amendment, mark the original invoice as AMENDED
    if (originalInvoiceId) {
      await prisma.invoice.update({
        where: { id: originalInvoiceId },
        data: { status: 'AMENDED' }
      })
    }

    sendSuccess(res, invoice, 'Invoice created successfully', 201)
  } catch (error: any) {
    sendError(res, error.message || 'Failed to create invoice', 500)
  }
  
}

export const getInvoices = async (req: any, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10 } = req.query
    const business = await prisma.business.findUnique({ where: { userId: req.user.id } })
    if (!business) {
      sendError(res, 'Business not found', 404)
      return
    }
    const skip = (Number(page) - 1) * Number(limit)
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where: { businessId: business.id },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.invoice.count({ where: { businessId: business.id } })
    ])
    sendPaginated(res, invoices, total, Number(page), Number(limit))
  } catch (error) {
    sendError(res, 'Failed to fetch invoices', 500)
  }
}

export const getInvoiceById = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true, business: true }
    })
    if (!invoice) {
      sendError(res, 'Invoice not found', 404)
      return
    }
    if (invoice.business.userId !== req.user.id) {
      sendError(res, 'Access denied', 403)
      return
    }
    sendSuccess(res, invoice)
  } catch (error) {
    sendError(res, 'Failed to fetch invoice', 500)
  }
}

export const getStats = async (req: any, res: Response): Promise<void> => {
  try {
    const business = await prisma.business.findUnique({ where: { userId: req.user.id } })
    if (!business) {
      sendError(res, 'Business not found', 404)
      return
    }

    const [
      totalInvoices,
      pendingInvoices,
      sentInvoices,
      amendedInvoices,
      failedInvoices,
      saleTotals,
      creditNoteTotals,
      debitNoteTotals,
      taxTotals
    ] = await Promise.all([
      // Total — only original invoices (SALE + PURCHASE), not amendments
      prisma.invoice.count({
        where: { businessId: business.id, invoiceType: { in: ['SALE', 'PURCHASE'] } }
      }),
      // Pending
      prisma.invoice.count({
        where: { businessId: business.id, status: 'PENDING' }
      }),
      // Sent
      prisma.invoice.count({
        where: { businessId: business.id, status: 'SENT' }
      }),
      // Amended
      prisma.invoice.count({
        where: { businessId: business.id, status: 'AMENDED' }
      }),
      // Failed
      prisma.invoice.count({
        where: { businessId: business.id, status: 'FAILED' }
      }),
      // Revenue from SENT SALE invoices only
      prisma.invoice.aggregate({
        where: { businessId: business.id, invoiceType: 'SALE', status: 'SENT' },
        _sum: { totalAmount: true, totalSalesTax: true }
      }),
      // Credit Notes reduce revenue
      prisma.invoice.aggregate({
        where: { businessId: business.id, invoiceType: 'CREDIT_NOTE', status: 'SENT' },
        _sum: { totalAmount: true, totalSalesTax: true }
      }),
      // Debit Notes increase revenue
      prisma.invoice.aggregate({
        where: { businessId: business.id, invoiceType: 'DEBIT_NOTE', status: 'SENT' },
        _sum: { totalAmount: true, totalSalesTax: true }
      }),
      // Total tax from all SENT invoices
      prisma.invoice.aggregate({
        where: { businessId: business.id, status: 'SENT' },
        _sum: { totalSalesTax: true }
      })
    ])

    const saleRevenue    = Number(saleTotals._sum.totalAmount      || 0)
    const creditDeducted = Math.abs(Number(creditNoteTotals._sum.totalAmount || 0))
    const debitAdded     = Math.abs(Number(debitNoteTotals._sum.totalAmount  || 0))
    const netRevenue     = saleRevenue - creditDeducted + debitAdded

    const saleTax    = Math.abs(Number(saleTotals._sum.totalSalesTax      || 0))
    const creditTax  = Math.abs(Number(creditNoteTotals._sum.totalSalesTax || 0))
    const debitTax   = Math.abs(Number(debitNoteTotals._sum.totalSalesTax  || 0))
    const netTax     = saleTax - creditTax + debitTax

    sendSuccess(res, {
      totalInvoices,
      pendingInvoices,
      sentInvoices,
      amendedInvoices,
      failedInvoices,
      totalRevenue:      netRevenue,
      totalTaxCollected: netTax,
      breakdown: {
        saleRevenue,
        creditDeducted,
        debitAdded
      }
    })
  } catch (error) {
    sendError(res, 'Failed to fetch stats', 500)
  }
}

export const downloadInvoicePdf = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true, business: true }
    })
    if (!invoice) { sendError(res, 'Invoice not found', 404); return }
    if (invoice.business.userId !== req.user.id) { sendError(res, 'Access denied', 403); return }

    const pdfBuffer = await generatePdfBuffer(invoice)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.id}.pdf`)
    res.send(pdfBuffer)
  } catch (error) {
    sendError(res, 'Failed to generate PDF', 500)
  }
}
export const submitToFBR = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true, business: true }
    })
    if (!invoice) {
      sendError(res, 'Invoice not found', 404)
      return
    }
    if (invoice.business.userId !== req.user.id) {
      sendError(res, 'Access denied', 403)
      return
    }
    if (invoice.status === 'SENT') {
      sendError(res, 'Invoice already submitted to FBR', 400)
      return
    }
    if (invoice.status === 'AMENDED') {
      sendError(res, 'This invoice has been amended and cannot be resubmitted. Use the Credit/Debit Note instead.', 400)
      return
    }
    if (!invoice.business.securityToken) {
      sendError(res, 'FBR Security Token not configured. Please add it in Settings.', 400)
      return
    }
    if (!invoice.business.posId) {
      sendError(res, 'POS ID not configured. Please add it in Settings.', 400)
      return
    }
    const fbrData = fbrService.formatInvoice(invoice, invoice.business)
    const result = await fbrService.postInvoice(fbrData, invoice.business.securityToken)
    if (result.success) {
      const updatedInvoice = await prisma.invoice.update({
        where: { id },
        data: {
          fbrInvoiceNo: result.fbrInvoiceNo,
          status: 'SENT',
          sentAt: new Date()
        },
        include: { items: true, business: true }
      })
      sendSuccess(res, {
        invoice: updatedInvoice,
        fbrInvoiceNo: result.fbrInvoiceNo
      }, `Invoice successfully submitted to FBR. FBR No: ${result.fbrInvoiceNo}`)
    } else {
      await prisma.invoice.update({
        where: { id },
        data: {
          status: 'FAILED',
          errorMessage: result.error,
          retryCount: { increment: 1 }
        }
      })
      sendError(res, `FBR submission failed: ${result.error}`, 400)
    }
  } catch (error: any) {
    sendError(res, error.message || 'Failed to submit to FBR', 500)
  }
}
export const sendInvoiceEmail = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { buyerEmail } = req.body

    if (!buyerEmail) {
      sendError(res, 'Buyer email is required', 400)
      return
    }

    // Fetch invoice with items and business
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true, business: true }
    })

    if (!invoice) {
      sendError(res, 'Invoice not found', 404)
      return
    }
    if (invoice.business.userId !== req.user.id) {
      sendError(res, 'Access denied', 403)
      return
    }

    // Block if not submitted to FBR yet
    if (!invoice.fbrInvoiceNo) {
      sendError(res, 'Invoice must be submitted to FBR before sending to buyer', 400)
      return
    }

    // Generate PDF buffer
    const pdfBuffer = await generatePdfBuffer(invoice)

    // Send email
    const result = await emailService.sendInvoiceToBuyer({
      toEmail:   buyerEmail,
      toName:    invoice.buyerName || 'Valued Customer',
      invoice,
      business:  invoice.business,
      pdfBuffer
    })

    if (result.success) {
      sendSuccess(res, null, 'Invoice email sent successfully')
    } else {
      sendError(res, result.error || 'Failed to send email', 500)
    }

  } catch (error: any) {
    sendError(res, error.message || 'Failed to send invoice email', 500)
  }
}