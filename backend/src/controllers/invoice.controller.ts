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
    const doc = new PDFDocument({ margin: 50 })
    const chunks: Buffer[] = []

    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const isAmendment = invoice.invoiceType === 'CREDIT_NOTE' || invoice.invoiceType === 'DEBIT_NOTE'
    const isCreditNote = invoice.invoiceType === 'CREDIT_NOTE'

    const titleMap: Record<string, string> = {
      SALE: 'TAX INVOICE', PURCHASE: 'PURCHASE INVOICE',
      CREDIT_NOTE: 'CREDIT NOTE', DEBIT_NOTE: 'DEBIT NOTE'
    }
    const titleColor: Record<string, string> = {
      SALE: 'black', PURCHASE: 'black',
      CREDIT_NOTE: '#cc0000', DEBIT_NOTE: '#cc6600'
    }
    const title  = titleMap[invoice.invoiceType]  || 'TAX INVOICE'
    const tColor = titleColor[invoice.invoiceType] || 'black'

    doc.fontSize(22).font('Helvetica-Bold').fillColor(tColor).text(title, { align: 'center' })
    doc.fillColor('black')
    doc.fontSize(10).font('Helvetica').text('Federal Board of Revenue - e-Invoice System', { align: 'center' })
    doc.moveDown(0.5)

    if (isAmendment && invoice.originalInvoice) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor(tColor)
        .text(`This ${title} amends FBR Invoice No: ${invoice.originalInvoice.fbrInvoiceNo || invoice.originalInvoiceId}`, { align: 'center' })
      doc.fillColor('black')
      if (invoice.amendmentReason) {
        doc.fontSize(9).font('Helvetica').fillColor('#555555')
          .text(`Reason: ${invoice.amendmentReason}`, { align: 'center' })
        doc.fillColor('black')
      }
      doc.moveDown(0.5)
    }

    if (invoice.fbrInvoiceNo) {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('green')
        .text(`FBR Invoice No: ${invoice.fbrInvoiceNo}`, { align: 'center' })
      doc.fillColor('black')
      doc.moveDown(0.5)
    }

    doc.image(qrBuffer, 450, 50, { width: 90, height: 90 })
    doc.fontSize(7).fillColor('gray').text('Scan to verify', 450, 142, { width: 90, align: 'center' })
    doc.fillColor('black')

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke()
    doc.moveDown()

    const topY = doc.y
    doc.fontSize(10).font('Helvetica-Bold').text('SELLER', 50, topY)
    doc.fontSize(9).font('Helvetica')
      .text(invoice.business.businessName || 'N/A', 50, topY + 15)
      .text(`NTN: ${invoice.business.ntn || 'N/A'}`, 50, topY + 28)
      .text(`STRN: ${invoice.business.strn || 'N/A'}`, 50, topY + 41)

    doc.fontSize(10).font('Helvetica-Bold').text('BUYER', 300, topY)
    doc.fontSize(9).font('Helvetica')
      .text(invoice.buyerName || 'Walk-in Customer', 300, topY + 15)
      .text(`NTN: ${invoice.buyerNtn || 'N/A'}`, 300, topY + 28)
      .text(`CNIC: ${invoice.buyerCnic || 'N/A'}`, 300, topY + 41)

    doc.moveDown(5)
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke()
    doc.moveDown()

    doc.fontSize(9).font('Helvetica')
      .text(`Invoice Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}`, 50)
      .text(`Type: ${title}`, 50)
      .text(`Sale Type: ${invoice.saleType}`, 50)
      .text(`Status: ${invoice.status}`, 50)

    if (invoice.fbrInvoiceNo) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('green')
        .text(`FBR Invoice No: ${invoice.fbrInvoiceNo}`, 50)
      doc.fillColor('black')
    }
    if (isAmendment && invoice.originalInvoice?.fbrInvoiceNo) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor(tColor)
        .text(`Amends FBR Invoice: ${invoice.originalInvoice.fbrInvoiceNo}`, 50)
      doc.fillColor('black')
    }
    if (invoice.amendmentReason) {
      doc.fontSize(9).font('Helvetica').fillColor('#555555')
        .text(`Amendment Reason: ${invoice.amendmentReason}`, 50)
      doc.fillColor('black')
    }

    doc.moveDown()
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke()
    doc.moveDown()

    doc.fontSize(9).font('Helvetica-Bold')
    doc.text('Description', 50, doc.y, { width: 160 })
    doc.text('HS Code',     210, doc.y - 9, { width: 80 })
    doc.text('Qty',         290, doc.y - 9, { width: 40 })
    doc.text('Rate',        330, doc.y - 9, { width: 70 })
    doc.text('Amount',      400, doc.y - 9, { width: 70 })
    doc.text('Sales Tax',   470, doc.y - 9, { width: 70 })
    doc.moveDown(0.5)
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke()
    doc.moveDown(0.5)

    doc.font('Helvetica').fontSize(8)
    invoice.items.forEach((item: any) => {
      const rowY  = doc.y
      const qty    = isCreditNote ? Math.abs(Number(item.quantity))    : Number(item.quantity)
      const amount = isCreditNote ? Math.abs(Number(item.totalAmount)) : Number(item.totalAmount)
      const tax    = isCreditNote ? Math.abs(Number(item.salesTax))    : Number(item.salesTax)

      doc.text(item.description || '—',               50,  rowY, { width: 160 })
      doc.text(item.hsCode || '—',                    210, rowY, { width: 80 })
      doc.text(String(qty),                           290, rowY, { width: 40 })
      doc.text(`PKR ${Number(item.rate).toFixed(2)}`, 330, rowY, { width: 70 })
      doc.text(`PKR ${amount.toFixed(2)}`,            400, rowY, { width: 70 })
      doc.text(`PKR ${tax.toFixed(2)}`,               470, rowY, { width: 70 })
      doc.moveDown(1.2)
    })

    doc.moveDown()
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke()
    doc.moveDown()

    const subtotal   = isCreditNote ? Math.abs(Number(invoice.totalAmount))   : Number(invoice.totalAmount)
    const salesTax   = isCreditNote ? Math.abs(Number(invoice.totalSalesTax)) : Number(invoice.totalSalesTax)
    const fed        = isCreditNote ? Math.abs(Number(invoice.totalFed))       : Number(invoice.totalFed)
    const discount   = Number(invoice.totalDiscount)
    const grandTotal = subtotal + salesTax + fed - discount

    doc.fontSize(9).font('Helvetica')
      .text(`Subtotal:`,  380).moveUp().text(`PKR ${subtotal.toFixed(2)}`,  470)
      .text(`Sales Tax:`, 380).moveUp().text(`PKR ${salesTax.toFixed(2)}`,  470)
    if (fed > 0) {
      doc.text(`FED:`, 380).moveUp().text(`PKR ${fed.toFixed(2)}`, 470)
    }
    if (discount > 0) {
      doc.text(`Discount:`, 380).moveUp().text(`- PKR ${discount.toFixed(2)}`, 470)
    }
    doc.fontSize(10).font('Helvetica-Bold')
      .text(`Grand Total:`, 380).moveUp()
      .text(`PKR ${grandTotal.toFixed(2)}`, 470)

    doc.moveDown(2)
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke()
    doc.moveDown()

    if (isAmendment) {
      doc.fontSize(8).font('Helvetica-Bold').fillColor(tColor)
        .text(`This is a ${title}. It supersedes and corrects the original invoice referenced above.`, { align: 'center' })
      doc.fillColor('black')
      doc.moveDown(0.3)
    }

    doc.fontSize(8).font('Helvetica').fillColor('gray')
      .text('This is a computer generated document. Scan QR code to verify authenticity.', { align: 'center' })
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