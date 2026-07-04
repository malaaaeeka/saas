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
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' })
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
    const pageWidth = doc.page.width - 60 // usable width inside 30pt margins

    // ===== Header: Business name (left) + QR (right) =====
    doc.fontSize(16).font('Helvetica-Bold').text(invoice.business.businessName || 'N/A', 30, 30)
    doc.image(qrBuffer, doc.page.width - 110, 25, { width: 80, height: 80 })
    doc.fontSize(7).fillColor('gray')
      .text('Scan to verify', doc.page.width - 110, 107, { width: 80, align: 'center' })
    doc.fillColor('black')

    doc.moveTo(30, 120).lineTo(doc.page.width - 30, 120).stroke()

    // ===== Three-column info block: Seller | Buyer | Invoice Summary =====
    const colY = 132
    const col1 = 30
    const col2 = 290
    const col3 = 550

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
    doc.moveTo(30, tableTop).lineTo(doc.page.width - 30, tableTop).stroke()
    tableTop += 6

    // Column definitions — 19 columns matching FBR portal layout
    const cols = [
      { key: 'sr',          label: 'Sr.',            x: 30,  w: 18  },
      { key: 'hsCode',      label: 'HS Code',         x: 48,  w: 40  },
      { key: 'hsDesc',      label: 'HS Code Desc.',   x: 88,  w: 95  },
      { key: 'prodDesc',    label: 'Product Desc.',   x: 183, w: 75  },
      { key: 'saleType',    label: 'Sale Type',       x: 258, w: 60  },
      { key: 'qty',         label: 'Qty',             x: 318, w: 28  },
      { key: 'uom',         label: 'UoM',             x: 346, w: 26  },
      { key: 'rate',        label: 'Rate',            x: 372, w: 35  },
      { key: 'salesValue',  label: 'Sales Value',     x: 407, w: 48  },
      { key: 'retailPrice', label: 'Retail Price',    x: 455, w: 42  },
      { key: 'salesTax',    label: 'Sales Tax',       x: 497, w: 40  },
      { key: 'extraTax',    label: 'Extra Tax',       x: 537, w: 35  },
      { key: 'furtherTax',  label: 'Further Tax',     x: 572, w: 35  },
      { key: 'fed',         label: 'FED',             x: 607, w: 26  },
      { key: 'stWht',       label: 'ST WHT',          x: 633, w: 30  },
      { key: 'discount',    label: 'Discount',        x: 663, w: 30  },
      { key: 'sro',         label: 'SRO/Schedule',    x: 693, w: 48  },
      { key: 'sroItemSr',   label: 'SRO Item Sr.',    x: 741, w: 32  },
      { key: 'status',      label: 'Status',          x: 773, w: 26  },
    ]

    doc.fontSize(6.5).font('Helvetica-Bold')
    cols.forEach(c => doc.text(c.label, c.x, tableTop, { width: c.w }))
    tableTop += 12
    doc.moveTo(30, tableTop).lineTo(doc.page.width - 30, tableTop).stroke()
    tableTop += 5

    doc.font('Helvetica').fontSize(6.5)
    invoice.items.forEach((item: any, i: number) => {
      const qty          = isCreditNote ? Math.abs(Number(item.quantity))    : Number(item.quantity)
      const salesValue   = isCreditNote ? Math.abs(Number(item.totalAmount)) : Number(item.totalAmount)
      const salesTax     = isCreditNote ? Math.abs(Number(item.salesTax))    : Number(item.salesTax)
      const fed          = Number(item.fed || 0)
      const discount     = Number(item.discount || 0)
      const extraTax     = Number(item.extraTax || 0)
      const furtherTax   = Number(item.furtherTax || 0)
      const retailPrice  = Number(item.fixedNotifiedValue || 0)
      const stWht        = Number(item.stWithheld || 0)

      const rowY = tableTop
      doc.text(String(i + 1),                          30,  rowY, { width: 18 })
      doc.text(item.hsCode || '—',                      48,  rowY, { width: 40 })
      doc.text(item.hsCodeDescription || '—',           88,  rowY, { width: 95 })
      doc.text(item.description || '—',                 183, rowY, { width: 75 })
      doc.text(invoice.saleType || '—',                 258, rowY, { width: 60 })
      doc.text(String(qty),                             318, rowY, { width: 28 })
      doc.text(item.uom || '—',                         346, rowY, { width: 26 })
      doc.text(Number(item.rate).toFixed(2),            372, rowY, { width: 35 })
      doc.text(salesValue.toFixed(2),                   407, rowY, { width: 48 })
      doc.text(retailPrice.toFixed(2),                  455, rowY, { width: 42 })
      doc.text(salesTax.toFixed(2),                     497, rowY, { width: 40 })
      doc.text(extraTax.toFixed(2),                     537, rowY, { width: 35 })
      doc.text(furtherTax.toFixed(2),                   572, rowY, { width: 35 })
      doc.text(fed.toFixed(2),                          607, rowY, { width: 26 })
      doc.text(stWht.toFixed(2),                        633, rowY, { width: 30 })
      doc.text(discount.toFixed(2),                     663, rowY, { width: 30 })
      doc.text(item.sroSchedule || '—',                 693, rowY, { width: 48 })
      doc.text(item.itemSNo || '—',                     741, rowY, { width: 32 })
      doc.text(invoice.status || '—',                   773, rowY, { width: 26 })

      // advance row by the tallest wrapped cell (HS Code Desc or Product Desc usually tallest)
      const hsDescHeight   = doc.heightOfString(item.hsCodeDescription || '—', { width: 95 })
      const prodDescHeight = doc.heightOfString(item.description || '—', { width: 75 })
      const tallest = Math.max(hsDescHeight, prodDescHeight, 10)
      tableTop += tallest + 5
    })

    doc.moveTo(30, tableTop).lineTo(doc.page.width - 30, tableTop).stroke()
    tableTop += 10

    // ===== Totals row =====
    const subtotal   = isCreditNote ? Math.abs(Number(invoice.totalAmount))   : Number(invoice.totalAmount)
    const salesTaxTotal = isCreditNote ? Math.abs(Number(invoice.totalSalesTax)) : Number(invoice.totalSalesTax)
    const fedTotal   = isCreditNote ? Math.abs(Number(invoice.totalFed))     : Number(invoice.totalFed)
    const discountTotal = Number(invoice.totalDiscount)
    const grandTotal = subtotal + salesTaxTotal + fedTotal - discountTotal

    doc.fontSize(9).font('Helvetica-Bold')
      .text(`Total Sales Value: PKR ${subtotal.toFixed(2)}`,     500, tableTop)
      .text(`Total Sales Tax: PKR ${salesTaxTotal.toFixed(2)}`,  500, tableTop + 14)
      .text(`Grand Total: PKR ${grandTotal.toFixed(2)}`,         500, tableTop + 32)

    tableTop += 60

    if (isAmendment) {
      doc.fontSize(8).font('Helvetica-Bold')
        .text(`This is a ${title}. It supersedes and corrects the original invoice referenced above.`, 30, tableTop, { align: 'center', width: pageWidth })
      tableTop += 14
    }

    // ===== Footer =====
    doc.fontSize(7).font('Helvetica').fillColor('gray')
      .text('In the above invoices, "E" denotes that the invoice has been edited, whereas "C" indicates that the invoice has been cancelled.', 30, doc.page.height - 40, { width: pageWidth - 60 })
      .text('This is a computer generated document. Scan QR code to verify authenticity.', 30, doc.page.height - 40, { align: 'right', width: pageWidth })
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
              hsCodeDescription: item.hsCodeDescription || null,
              productCode: item.productCode,
              description: item.description,
              quantity: item.quantity,
              uom: item.uom,
              rate: item.rate,
              totalAmount: item.totalAmount,
              salesTax: item.salesTax,
              sroSchedule: item.sroSchedule,
              itemSNo: item.itemSNo || null,
              fed: item.fed || 0,
              extraTax: item.extraTax || 0,
              furtherTax: item.furtherTax || 0,
              fixedNotifiedValue: item.fixedNotifiedValue || 0,
              stWithheld: item.stWithheld || 0,
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