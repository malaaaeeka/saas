import prisma from '../config/database'
import fbrService from '../services/fbr.service'

// ===== Buyer resolution — same logic as createInvoice in invoice.controller.ts =====
async function resolveBuyer(business: any, buyerId: string | null, buyerName: string, buyerNtn: string, buyerCnic: string, buyerType: string) {
  let resolvedBuyerName = buyerName
  let resolvedBuyerNtn = buyerNtn
  let resolvedBuyerCnic = buyerCnic
  let finalBuyerId = buyerId || null

  if (buyerId) {
    const buyer = await prisma.buyer.findUnique({ where: { id: buyerId } })
    if (!buyer || buyer.businessId !== business.id) {
      throw new Error('Buyer not found')
    }
    resolvedBuyerName = buyer.buyerName
    resolvedBuyerNtn = buyer.buyerNtn ?? ''
    resolvedBuyerCnic = buyer.buyerCnic ?? ''
  } else if (buyerName && buyerName.trim()) {
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
      resolvedBuyerNtn = existing.buyerNtn ?? ''
      resolvedBuyerCnic = existing.buyerCnic ?? ''
    } else {
      const newBuyer = await prisma.buyer.create({
        data: { businessId: business.id, buyerName, buyerNtn: buyerNtn || null, buyerCnic: buyerCnic || null, buyerType: buyerType || 'Unregistered' }
      })
      finalBuyerId = newBuyer.id
    }
  }

  return { finalBuyerId, resolvedBuyerName, resolvedBuyerNtn, resolvedBuyerCnic }
}

// ===== Create an Invoice + InvoiceItem[] record. Same logic as createInvoice
// in invoice.controller.ts, minus the req/res plumbing so it can be reused
// by both the single-invoice route and the bulk-upload service. =====
export async function createInvoiceRecord(business: any, payload: any) {
  const {
    invoiceType, documentType, originationProvince, destinationProvince,
    invoiceDate, buyerId, buyerNtn, buyerCnic, buyerName, buyerType,
    saleType, branchId, items, originalInvoiceId, amendmentReason, status
  } = payload

  const { finalBuyerId, resolvedBuyerName, resolvedBuyerNtn, resolvedBuyerCnic } =
    await resolveBuyer(business, buyerId, buyerName, buyerNtn, buyerCnic, buyerType)

  let rootInvoiceId: string | null = null
  if (originalInvoiceId) {
    const parent = await prisma.invoice.findUnique({ where: { id: originalInvoiceId } })
    rootInvoiceId = parent ? (parent.rootInvoiceId || parent.id) : null
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
      rootInvoiceId: rootInvoiceId,
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

  if (originalInvoiceId) {
    await prisma.invoice.update({
      where: { id: originalInvoiceId },
      data: { status: 'AMENDED' }
    })
  }

  return invoice
}

// ===== Submit an already-created invoice to FBR. Same logic as submitToFBR
// in invoice.controller.ts, minus req/res plumbing. Throws on failure so
// callers (route handler or bulk loop) can decide how to report it. =====
export async function submitInvoiceToFbr(invoiceId: string, business: any) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true, business: true }
  })
  if (!invoice) throw new Error('Invoice not found')
  if (invoice.status === 'SENT') throw new Error('Invoice already submitted to FBR')
  if (invoice.status === 'AMENDED' || invoice.status === 'EDITED') throw new Error('This invoice has been amended or edited and cannot be resubmitted')
  if (!business.securityToken) throw new Error('FBR Security Token not configured. Please add it in Settings.')
  if (!business.posId) throw new Error('POS ID not configured. Please add it in Settings.')

  const fbrData = fbrService.formatInvoice(invoice, business)
  const result = await fbrService.postInvoice(fbrData, business.securityToken)

  if (result.success) {
    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { fbrInvoiceNo: result.fbrInvoiceNo, status: 'SENT', sentAt: new Date() },
      include: { items: true }
    })
    return { invoice: updated, fbrInvoiceNo: result.fbrInvoiceNo }
  } else {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'FAILED', errorMessage: result.error, retryCount: { increment: 1 } }
    })
    throw new Error(result.error || 'FBR submission failed')
  }
}

// ===== Convenience wrapper for bulk upload: create the record, then
// immediately submit it to FBR in one call. =====
export async function createAndSubmitInvoice(business: any, payload: any) {
  const invoice = await createInvoiceRecord(business, payload)
  if (payload.status === 'DRAFT') {
    return { invoice, fbrInvoiceNo: null } // draft invoices aren't submitted
  }
  const result = await submitInvoiceToFbr(invoice.id, business)
  return result
}