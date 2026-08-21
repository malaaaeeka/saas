import prisma from '../src/config/database'

async function main() {
  console.log('Fetching all invoice items...')

  const items = await prisma.invoiceItem.findMany({
    include: {
      invoice: {
        select: { businessId: true, createdAt: true }
      }
    },
    orderBy: {
      invoice: { createdAt: 'desc' } // newest first, so newest values win per description
    }
  })

  console.log(`Found ${items.length} invoice items across all invoices`)

  // Dedupe by businessId + description, keeping the newest occurrence
  const seen = new Set<string>()
  let created = 0
  let skipped = 0

  for (const item of items) {
    const businessId = item.invoice.businessId
    const description = item.description.trim()
    if (!description) continue

    const key = `${businessId}::${description.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)

    try {
      const result = await prisma.product.upsert({
        where: {
          businessId_description: { businessId, description }
        },
        update: {}, // don't overwrite existing products, only fill gaps below
        create: {
          businessId,
          description,
          hsCode: item.hsCode || null,
          hsCodeDescription: item.hsCodeDescription || null,
          uom: item.uom || null,
          rate: item.rate || null,
          taxRate: null, // not derivable from InvoiceItem.salesTax reliably
          sroSchedule: item.sroSchedule || null,
          itemSNo: item.itemSNo || null
        }
      })
      created++
      console.log(`✓ ${businessId} — ${description}`)
    } catch (err) {
      skipped++
      console.error(`✗ Failed for ${description}:`, err)
    }
  }

  console.log(`\nDone. ${created} products upserted, ${skipped} skipped/failed.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())