import prisma from '../config/database'

async function findRoot(invoiceId: string, cache: Map<string, string>): Promise<string> {
  if (cache.has(invoiceId)) return cache.get(invoiceId)!
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } })
  if (!invoice) return invoiceId
  if (!invoice.originalInvoiceId) {
    cache.set(invoiceId, invoiceId)
    return invoiceId
  }
  const root = await findRoot(invoice.originalInvoiceId, cache)
  cache.set(invoiceId, root)
  return root
}

async function main() {
  const children = await prisma.invoice.findMany({
    where: { originalInvoiceId: { not: null }, rootInvoiceId: null }
  })
  const cache = new Map<string, string>()
  for (const child of children) {
    const root = await findRoot(child.originalInvoiceId!, cache)
    await prisma.invoice.update({ where: { id: child.id }, data: { rootInvoiceId: root } })
    console.log(`${child.id} -> root ${root}`)
  }
  console.log(`Backfilled ${children.length} invoices`)
}

main().catch(console.error).finally(() => process.exit())