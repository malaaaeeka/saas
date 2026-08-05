// backend/src/services/bulkInvoice.service.ts
import prisma from '../config/database'
import { createAndSubmitInvoice } from './invoiceCore.service'

export async function processBulkBatch(batchId: string, invoices: any[], businessId: string) {
  const business = await prisma.business.findUnique({ where: { id: businessId } })
  if (!business) {
    await prisma.bulkBatch.update({ where: { id: batchId }, data: { status: 'DONE' } })
    return
  }

  const results: {
    documentNumber: string
    status: 'SUCCESS' | 'FAILED'
    fbrInvoiceNo?: string
    error?: string
  }[] = []

  for (const inv of invoices) {
    const docNumber = inv.items?.[0]?.documentNumber || 'UNKNOWN'
    try {
      const result = await createAndSubmitInvoice(business, inv)
      results.push({
        documentNumber: docNumber,
        status: 'SUCCESS',
        fbrInvoiceNo: result.fbrInvoiceNo || undefined,
      })
    } catch (err: any) {
      results.push({
        documentNumber: docNumber,
        status: 'FAILED',
        error: err.message || 'Unknown error',
      })
    }

    await prisma.bulkBatch.update({
      where: { id: batchId },
      data: { completed: results.length },
    })
  }

  await prisma.bulkBatch.update({
    where: { id: batchId },
    data: { status: 'DONE', results: { create: results } },
  })
}