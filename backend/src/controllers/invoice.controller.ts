import { Request, Response } from 'express'
import prisma from '../config/database'
import { sendSuccess, sendError, sendPaginated } from '../utils/response'
import PDFDocument from 'pdfkit'
import { generateQRCode, generateInvoiceQRData } from '../services/qr.service'
import fbrService from '../services/fbr.service'
import emailService from '../services/email.service'
import { processBulkBatch } from '../services/bulkInvoice.service' 

const s = (v: unknown): string => (v === null || v === undefined ? '' : String(v))

function serializeInvoice(invoice: any) {
  return {
    ...invoice,
    buyerNtn: s(invoice.buyerNtn),
    buyerCnic: s(invoice.buyerCnic),
    buyerName: s(invoice.buyerName),
    fbrInvoiceNo: s(invoice.fbrInvoiceNo),
    errorMessage: s(invoice.errorMessage),
    amendmentReason: s(invoice.amendmentReason),
    originalInvoiceId: s(invoice.originalInvoiceId),
    items: (invoice.items || []).map((item: any) => ({
      ...item,
      hsCodeDescription: s(item.hsCodeDescription),
      productCode: s(item.productCode),
      itemSNo: s(item.itemSNo),
    }))
  }
}


export const bulkCreateInvoices = async (req: any, res: Response): Promise<void> => {
  try {
    const { invoices } = req.body
    if (!Array.isArray(invoices) || invoices.length === 0) {
      sendError(res, 'No invoices provided', 400)
      return
    }
    const business = await prisma.business.findUnique({ where: { userId: req.user.id } })
    if (!business) {
      sendError(res, 'Business profile not found', 404)
      return
    }
    const batch = await prisma.bulkBatch.create({
      data: { businessId: business.id, total: invoices.length, status: 'PROCESSING' }
    })
    processBulkBatch(batch.id, invoices, business.id) // fire-and-forget
    sendSuccess(res, { batchId: batch.id }, 'Bulk upload started', 202)
  } catch (error: any) {
    sendError(res, error.message || 'Failed to start bulk upload', 500)
  }
}

export const getBulkBatchStatus = async (req: any, res: Response): Promise<void> => {
  try {
    const { batchId } = req.params
    const batch = await prisma.bulkBatch.findUnique({
      where: { id: batchId },
      include: { results: true }
    })
    if (!batch) { sendError(res, 'Batch not found', 404); return }
    sendSuccess(res, batch)
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch batch status', 500)
  }
}

export const generatePdfBuffer = async (invoice: any, options: { includeSro?: boolean } = {}): Promise<Buffer> => {
  const includeSro = options.includeSro !== false // default true
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
    const pageWidth = doc.page.width - 60

    // ===== Header (unchanged) =====
    doc.fontSize(16).font('Helvetica-Bold').text(invoice.business.businessName || 'N/A', 30, 30)
    doc.image(qrBuffer, doc.page.width - 110, 25, { width: 80, height: 80 })
    doc.fontSize(7).fillColor('gray')
      .text('Scan to verify', doc.page.width - 110, 107, { width: 80, align: 'center' })
    doc.fillColor('black')

    doc.moveTo(30, 120).lineTo(doc.page.width - 30, 120).stroke()

    // ===== Three-column info block (unchanged) =====
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
    const tableLeft = 30

    const baseCols = [
      { key: 'sr',          label: 'Sr. No.',              w: 20  },
      { key: 'hsCode',      label: 'HS Code',               w: 38  },
      { key: 'hsDesc',      label: 'HS Code Description',   w: 95  },
      { key: 'prodDesc',    label: 'Product Description',   w: 75  },
      { key: 'saleType',    label: 'Sales Type',            w: 58  },
      { key: 'qty',         label: 'Quantity',              w: 30  },
      { key: 'uom',         label: 'UoM',                   w: 24  },
      { key: 'rate',        label: 'Rate',                  w: 26  },
      { key: 'salesValue',  label: 'Sales Value',           w: 48  },
      { key: 'retailPrice', label: 'Retail Price',          w: 40  },
      { key: 'salesTax',    label: 'Sales Tax',             w: 40  },
      { key: 'extraTax',    label: 'Extra Tax',             w: 34  },
      { key: 'furtherTax',  label: 'Further Tax',           w: 34  },
      { key: 'fed',         label: 'FED',                   w: 24  },
      { key: 'stWht',       label: 'ST WHT',                w: 28  },
      { key: 'discount',    label: 'Discount',              w: 30  },
      { key: 'sro',         label: 'SRO / Schedule No.',    w: 46  },
      { key: 'sroItemSr',   label: 'SRO Item Sr. No.',      w: 32  },
      { key: 'status',      label: 'Status',                w: 26  },
    ]

    // Drop the SRO columns when not requested, and redistribute their width
    // proportionally across the remaining columns so the table still fills
    // the same total width instead of leaving a gap on the right.
    let cols = baseCols
    if (!includeSro) {
      const dropped = baseCols.filter(c => c.key === 'sro' || c.key === 'sroItemSr')
      const freedWidth = dropped.reduce((sum, c) => sum + c.w, 0)
      const kept = baseCols.filter(c => c.key !== 'sro' && c.key !== 'sroItemSr')
      const keptTotalWidth = kept.reduce((sum, c) => sum + c.w, 0)
      cols = kept.map(c => ({ ...c, w: c.w + (c.w / keptTotalWidth) * freedWidth }))
    }

    let runningX = tableLeft
    const colX: number[] = []
    cols.forEach(c => { colX.push(runningX); runningX += c.w })
    const tableWidth = runningX - tableLeft

    // Helper to find a column's index by key (robust even if columns are removed)
    const idx = (key: string) => cols.findIndex(c => c.key === key)

    // ---- Header row ----
    const headerHeight = 22
    doc.rect(tableLeft, tableTop, tableWidth, headerHeight).stroke()
    doc.fontSize(6.5).font('Helvetica-Bold')
    cols.forEach((c, i) => {
      doc.text(c.label, colX[i] + 2, tableTop + 4, { width: c.w - 4 })
      doc.moveTo(colX[i], tableTop).lineTo(colX[i], tableTop + headerHeight).stroke()
    })
    doc.moveTo(tableLeft + tableWidth, tableTop).lineTo(tableLeft + tableWidth, tableTop + headerHeight).stroke()

    tableTop += headerHeight

    // ---- Item rows ----
    doc.font('Helvetica').fontSize(6.5)
    const rowTops: number[] = [tableTop]

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

      const hsDescHeight   = doc.heightOfString(item.hsCodeDescription || '—', { width: cols[idx('hsDesc')].w - 4 })
      const prodDescHeight = doc.heightOfString(item.description || '—', { width: cols[idx('prodDesc')].w - 4 })
      const rowHeight = Math.max(hsDescHeight, prodDescHeight, 10) + 8

      const rowY = tableTop

      const valueMap: Record<string, string> = {
        sr: String(i + 1), hsCode: item.hsCode || '—', hsDesc: item.hsCodeDescription || '—',
        prodDesc: item.description || '—', saleType: invoice.saleType || '—', qty: String(qty),
        uom: item.uom || '—', rate: Number(item.rate).toFixed(2), salesValue: salesValue.toFixed(2),
        retailPrice: retailPrice.toFixed(2), salesTax: salesTax.toFixed(2), extraTax: extraTax.toFixed(2),
        furtherTax: furtherTax.toFixed(2), fed: fed.toFixed(2), stWht: stWht.toFixed(2),
        discount: discount.toFixed(2), sro: item.sroSchedule || '—', sroItemSr: item.itemSNo || '—',
        status: invoice.status || '—'
      }

      cols.forEach((c, ci) => {
        doc.text(valueMap[c.key], colX[ci] + 2, rowY + 4, { width: c.w - 4 })
      })

      tableTop += rowHeight
      rowTops.push(tableTop)
    })

    const tableBottom = tableTop
    colX.forEach(x => doc.moveTo(x, rowTops[0] - headerHeight).lineTo(x, tableBottom).stroke())
    doc.moveTo(tableLeft + tableWidth, rowTops[0] - headerHeight).lineTo(tableLeft + tableWidth, tableBottom).stroke()
    rowTops.forEach(y => doc.moveTo(tableLeft, y).lineTo(tableLeft + tableWidth, y).stroke())

    // ---- Totals row (inside grid) ----
    const totalRowHeight = 16
    doc.rect(tableLeft, tableBottom, tableWidth, totalRowHeight).stroke()
    colX.forEach(x => doc.moveTo(x, tableBottom).lineTo(x, tableBottom + totalRowHeight).stroke())

    const subtotal       = isCreditNote ? Math.abs(Number(invoice.totalAmount))   : Number(invoice.totalAmount)
    const salesTaxTotal  = isCreditNote ? Math.abs(Number(invoice.totalSalesTax)) : Number(invoice.totalSalesTax)
    const fedTotal       = isCreditNote ? Math.abs(Number(invoice.totalFed))     : Number(invoice.totalFed)
    const discountTotal  = Number(invoice.totalDiscount)
    const grandTotal     = subtotal + salesTaxTotal + fedTotal - discountTotal

    doc.fontSize(6.5).font('Helvetica-Bold')
    doc.text('Total:', colX[idx('rate')] + 2, tableBottom + 4, { width: cols[idx('rate')].w - 4, align: 'right' })
    doc.text(subtotal.toFixed(2),      colX[idx('salesValue')] + 2, tableBottom + 4, { width: cols[idx('salesValue')].w - 4 })
    doc.text(salesTaxTotal.toFixed(2), colX[idx('salesTax')] + 2, tableBottom + 4, { width: cols[idx('salesTax')].w - 4 })
    doc.text(fedTotal.toFixed(2),      colX[idx('fed')] + 2, tableBottom + 4, { width: cols[idx('fed')].w - 4 })

    tableTop = tableBottom + totalRowHeight + 15

    doc.fontSize(9).font('Helvetica-Bold')
      .text(`Grand Total: PKR ${grandTotal.toFixed(2)}`, 500, tableTop)

    tableTop += 25

    if (isAmendment) {
      doc.fontSize(8).font('Helvetica-Bold')
        .text(`This is a ${title}. It supersedes and corrects the original invoice referenced above.`, 30, tableTop, { align: 'center', width: pageWidth })
      tableTop += 14
    }

    // ===== Footer =====
    doc.fontSize(7).font('Helvetica').fillColor('gray')
      .text('This is a computer generated document. Scan QR code to verify authenticity.', 30, doc.page.height - 40, { align: 'right', width: pageWidth })
    doc.fillColor('black')

    doc.end()
  })
}
export const createInvoice = async (req: any, res: Response): Promise<void> => {
  try {
    const { invoiceType, documentType, originationProvince, destinationProvince, invoiceDate, buyerId, buyerNtn, buyerCnic, buyerName, buyerType, saleType, branchId, items, originalInvoiceId, amendmentReason, status } = req.body
    const business = await prisma.business.findUnique({ where: { userId: req.user.id } })
    if (!business) {
      sendError(res, 'Business profile not found. Please set up your profile first.', 404)
      return
    }
    // If a buyerId was provided, snapshot that buyer's current details onto the invoice
    let resolvedBuyerName = buyerName
    let resolvedBuyerNtn = buyerNtn
    let resolvedBuyerCnic = buyerCnic

    let finalBuyerId = buyerId || null

    if (buyerId) {
      const buyer = await prisma.buyer.findUnique({ where: { id: buyerId } })
      if (!buyer || buyer.businessId !== business.id) {
        sendError(res, 'Buyer not found', 404)
        return
      }
      resolvedBuyerName = buyer.buyerName
      resolvedBuyerNtn = buyer.buyerNtn
      resolvedBuyerCnic = buyer.buyerCnic
    } else if (buyerName && buyerName.trim()) {
      // No existing buyer was selected, but a name was typed — save it
      // as a new Buyer so it's searchable on future invoices.
      // Reuse an existing buyer with the same NTN or CNIC if one exists, to avoid duplicates.
      let existing = buyerNtn
        ? await prisma.buyer.findUnique({
            where: { businessId_buyerNtn: { businessId: business.id, buyerNtn } }
          })
        : null

      if (!existing && buyerCnic) {
        existing = await prisma.buyer.findFirst({
          where: { businessId: business.id, buyerCnic }
        })
      }

      if (existing) {
        finalBuyerId = existing.id
        resolvedBuyerName = existing.buyerName
        resolvedBuyerNtn = existing.buyerNtn
        resolvedBuyerCnic = existing.buyerCnic
      } else {
       const newBuyer = await prisma.buyer.create({
        data: { businessId: business.id, buyerName, buyerNtn: buyerNtn || null, buyerCnic: buyerCnic || null, buyerType: buyerType || 'Unregistered' }
      })
      finalBuyerId = newBuyer.id
      }
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
        documentType: documentType || null,
        originationProvince: originationProvince || null,
        destinationProvince: destinationProvince || null,
        buyerType: buyerType || null,
        invoiceDate: new Date(invoiceDate),
        originalInvoiceId: originalInvoiceId || null,
        amendmentReason: amendmentReason || null,
        buyerId: finalBuyerId,
        buyerNtn: resolvedBuyerNtn || '',
        buyerCnic: resolvedBuyerCnic || '',
        buyerName: resolvedBuyerName || '',
        saleType,
        totalAmount,
        totalSalesTax,
        totalFed,
        totalDiscount,
        status: status === 'DRAFT' ? 'DRAFT' : 'PENDING',
        items: {
          createMany: {
            data: items.map((item: any) => ({
              documentNumber: item.documentNumber || null,
              invoiceRefNo: item.invoiceRefNo || null,
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

    sendSuccess(res, serializeInvoice(invoice), 'Invoice created successfully', 201)
  } catch (error: any) {
    sendError(res, error.message || 'Failed to create invoice', 500)
  }
  
}


export const updateInvoice = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { invoiceType, documentType, originationProvince, destinationProvince, invoiceDate, buyerId, buyerNtn, buyerCnic, buyerName, buyerType, saleType, branchId, items, amendmentReason, status } = req.body

    const business = await prisma.business.findUnique({ where: { userId: req.user.id } })
    if (!business) {
      sendError(res, 'Business profile not found. Please set up your profile first.', 404)
      return
    }

    const existingInvoice = await prisma.invoice.findUnique({ where: { id } })
    if (!existingInvoice) {
      sendError(res, 'Invoice not found', 404)
      return
    }
    if (existingInvoice.businessId !== business.id) {
      sendError(res, 'Access denied', 403)
      return
    }
 const needsNewRecord = existingInvoice.status === 'SENT' || existingInvoice.status === 'AMENDED'
 
    // Same buyer-resolution logic as createInvoice
    let resolvedBuyerName = buyerName
    let resolvedBuyerNtn = buyerNtn
    let resolvedBuyerCnic = buyerCnic
    let finalBuyerId = buyerId || null

    if (buyerId) {
      const buyer = await prisma.buyer.findUnique({ where: { id: buyerId } })
      if (!buyer || buyer.businessId !== business.id) {
        sendError(res, 'Buyer not found', 404)
        return
      }
      resolvedBuyerName = buyer.buyerName
      resolvedBuyerNtn = buyer.buyerNtn
      resolvedBuyerCnic = buyer.buyerCnic
       } else if (buyerName && buyerName.trim()) {
      // No existing buyer was selected, but a name was typed — save it
      // as a new Buyer so it's searchable on future invoices.
      // Reuse an existing buyer with the same NTN or CNIC if one exists, to avoid duplicates.
      let existing = buyerNtn
        ? await prisma.buyer.findUnique({
            where: { businessId_buyerNtn: { businessId: business.id, buyerNtn } }
          })
        : null

      if (!existing && buyerCnic) {
        existing = await prisma.buyer.findFirst({
          where: { businessId: business.id, buyerCnic }
        })
      }

      if (existing) {
        finalBuyerId = existing.id
        resolvedBuyerName = existing.buyerName
        resolvedBuyerNtn = existing.buyerNtn
        resolvedBuyerCnic = existing.buyerCnic
      } else {
        const newBuyer = await prisma.buyer.create({
          data: { businessId: business.id, buyerName, buyerNtn: buyerNtn || null, buyerCnic: buyerCnic || null, buyerType: buyerType || 'Unregistered' }
        })
        finalBuyerId = newBuyer.id
      }
    }

    const totalAmount = items.reduce((sum: number, item: any) => sum + Number(item.totalAmount), 0)
    const totalSalesTax = items.reduce((sum: number, item: any) => sum + Number(item.salesTax), 0)
    const totalFed = items.reduce((sum: number, item: any) => sum + Number(item.fed || 0), 0)
    const totalDiscount = items.reduce((sum: number, item: any) => sum + Number(item.discount || 0), 0)

    // Replace items: delete existing, recreate from the submitted form
    const invoice = await prisma.$transaction(async (tx) => {
      const itemData = items.map((item: any) => ({
        documentNumber: item.documentNumber || null,
        invoiceRefNo: item.invoiceRefNo || null,
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

      if (needsNewRecord) {
        await tx.invoice.update({ where: { id }, data: { status: 'EDITED' } })

        return tx.invoice.create({
          data: {
            businessId: business.id,
            branchId: branchId || null,
            invoiceType,
            documentType: documentType || null,
            originationProvince: originationProvince || null,
            destinationProvince: destinationProvince || null,
            buyerType: buyerType || null,
            invoiceDate: new Date(invoiceDate),
            originalInvoiceId: id,
            amendmentReason: amendmentReason || null,
            buyerId: finalBuyerId,
            buyerNtn: resolvedBuyerNtn || '',
            buyerCnic: resolvedBuyerCnic || '',
            buyerName: resolvedBuyerName || '',
            saleType,
            totalAmount,
            totalSalesTax,
            totalFed,
            totalDiscount,
            status: 'PENDING',
            items: { createMany: { data: itemData } }
          },
          include: { items: true }
        })
      }

      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } })

      return tx.invoice.update({
        where: { id },
        data: {
          branchId: branchId || null,
          invoiceType,
          documentType: documentType || null,
          originationProvince: originationProvince || null,
          destinationProvince: destinationProvince || null,
          buyerType: buyerType || null,
          invoiceDate: new Date(invoiceDate),
          amendmentReason: amendmentReason || null,
          buyerId: finalBuyerId,
          buyerNtn: resolvedBuyerNtn || '',
          buyerCnic: resolvedBuyerCnic || '',
          buyerName: resolvedBuyerName || '',
          saleType,
          totalAmount,
          totalSalesTax,
          totalFed,
          totalDiscount,
          status: status === 'DRAFT' ? 'DRAFT' : existingInvoice.status,
          items: { createMany: { data: itemData } }
        },
        include: { items: true }
      })
    })

    sendSuccess(res, serializeInvoice(invoice), 'Invoice updated successfully')
  } catch (error: any) {
    sendError(res, error.message || 'Failed to update invoice', 500)
  }
}

export const deleteInvoice = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const business = await prisma.business.findUnique({ where: { userId: req.user.id } })
    if (!business) {
      sendError(res, 'Business profile not found. Please set up your profile first.', 404)
      return
    }

    const invoice = await prisma.invoice.findUnique({ where: { id } })
    if (!invoice) {
      sendError(res, 'Invoice not found', 404)
      return
    }
    if (invoice.businessId !== business.id) {
      sendError(res, 'Access denied', 403)
      return
    }
    if (invoice.status === 'SENT' || invoice.status === 'AMENDED' || invoice.status === 'EDITED') {
      sendError(res, 'Cannot delete a submitted, amended, or edited invoice', 400)
      return
    }

    await prisma.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } })
      await tx.invoice.delete({ where: { id } })
    })

    sendSuccess(res, null, 'Invoice deleted successfully')
  } catch (error: any) {
    sendError(res, error.message || 'Failed to delete invoice', 500)
  }
}

export const getInvoiceCounts = async (req: any, res: Response): Promise<void> => {
  try {
    const business = await prisma.business.findUnique({ where: { userId: req.user.id } })
    if (!business) {
      sendError(res, 'Business not found', 404)
      return
    }

    const type = req.query.type as string | undefined
    const status = req.query.status as string | undefined

    const typeWhere: any = { businessId: business.id }
    if (status && status !== 'ALL') typeWhere.status = status

    const statusWhere: any = { businessId: business.id }
    if (type && type !== 'ALL') statusWhere.invoiceType = type

    const [typeCounts, statusCounts, totalForType, totalForStatus] = await Promise.all([
      prisma.invoice.groupBy({
        by: ['invoiceType'],
        where: typeWhere,
        _count: { _all: true }
      }),
      prisma.invoice.groupBy({
        by: ['status'],
        where: statusWhere,
        _count: { _all: true }
      }),
      prisma.invoice.count({ where: typeWhere }),
      prisma.invoice.count({ where: statusWhere })
    ])

    const byType: Record<string, number> = {}
    typeCounts.forEach(t => { byType[t.invoiceType] = t._count._all })

    const byStatus: Record<string, number> = {}
    statusCounts.forEach(s => { byStatus[s.status] = s._count._all })

    sendSuccess(res, { totalForType, totalForStatus, byType, byStatus })
  } catch (error) {
    sendError(res, 'Failed to fetch invoice counts', 500)
  }
}

export const getInvoices = async (req: any, res: Response): Promise<void> => {
  try {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1)
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 1000)
    const type = req.query.type as string | undefined
    const status = req.query.status as string | undefined
    const search = (req.query.search as string | undefined)?.trim()

    const business = await prisma.business.findUnique({ where: { userId: req.user.id } })
    if (!business) {
      sendError(res, 'Business not found', 404)
      return
    }

    const where: any = { businessId: business.id }
    if (type && type !== 'ALL') where.invoiceType = type
    if (status && status !== 'ALL') where.status = status
    if (search) {
      where.OR = [
        { buyerName: { contains: search, mode: 'insensitive' } },
        { fbrInvoiceNo: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
      ]
    }

    const skip = (page - 1) * limit
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ])

    sendPaginated(res, invoices.map(serializeInvoice), total, page, limit)
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
    sendSuccess(res, serializeInvoice(invoice))
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
    const includeSro = req.query.includeSro !== 'false' // default true unless explicitly 'false'

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true, business: true }
    })
    if (!invoice) { sendError(res, 'Invoice not found', 404); return }
    if (invoice.business.userId !== req.user.id) { sendError(res, 'Access denied', 403); return }

    const pdfBuffer = await generatePdfBuffer(invoice, { includeSro })
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
    if (invoice.status === 'AMENDED' || invoice.status === 'EDITED') {
      sendError(res, 'This invoice has been amended or edited and cannot be resubmitted.', 400)
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
        invoice: serializeInvoice(updatedInvoice),
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