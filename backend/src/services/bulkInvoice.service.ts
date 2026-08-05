// backend/src/services/bulkInvoice.service.ts
import prisma from '../config/database'
import { createAndSubmitInvoice } from './invoiceCore.service'

export async function processBulkBatch(batchId: string, invoices: any[], businessId: string) {
  const business = await prisma.business.findUnique({ where: { id: businessId } })
  if (!business) {
    await prisma.bulkBatch.update({ where: { id: batchId }, data: { status: 'DONE' } })
    return
  }

  const CONCURRENCY = 5 // start conservative — raise only if FBR doesn't rate-limit/error

  const results: {
    documentNumber: string
    status: 'SUCCESS' | 'FAILED'
    fbrInvoiceNo?: string
    error?: string
  }[] = []

  for (let i = 0; i < invoices.length; i += CONCURRENCY) {
    const chunk = invoices.slice(i, i + CONCURRENCY)

    const chunkResults = await Promise.all(
      chunk.map(async (inv) => {
        const docNumber = inv.items?.[0]?.documentNumber || 'UNKNOWN'
        try {
          const result = await createAndSubmitInvoice(business, inv)
          return {
            documentNumber: docNumber,
            status: 'SUCCESS' as const,
            fbrInvoiceNo: result.fbrInvoiceNo || undefined,
          }
        } catch (err: any) {
          return {
            documentNumber: docNumber,
            status: 'FAILED' as const,
            error: err.message || 'Unknown error',
          }
        }
      })
    )

    results.push(...chunkResults)

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