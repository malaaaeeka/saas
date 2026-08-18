/**
 * One-time cleanup script — merges duplicate Buyer rows that were created
 * before the NTN/CNIC dedup fix (each invoice for the same buyer used to
 * create a brand new Buyer instead of reusing one).
 *
 * Groups buyers per business by NTN (if present) else CNIC, keeps the
 * oldest one as the "survivor", repoints all invoices from the
 * duplicates to the survivor, then deletes the duplicates.
 *
 * Usage: npx ts-node src/scripts/dedupeBuyers.ts
 *        (run from the backend folder)
 */
import prisma from '../config/database'

async function main() {
  console.log('Starting buyer dedupe...')

  const buyers = await prisma.buyer.findMany({
    orderBy: { createdAt: 'asc' }
  })
  console.log(`Found ${buyers.length} total buyer rows`)

  // Group by businessId + (buyerNtn if present, else buyerCnic)
  const groups = new Map<string, typeof buyers>()

  for (const buyer of buyers) {
    const key = buyer.buyerNtn
      ? `${buyer.businessId}::ntn::${buyer.buyerNtn}`
      : buyer.buyerCnic
        ? `${buyer.businessId}::cnic::${buyer.buyerCnic}`
        : null

    if (!key) continue // no NTN or CNIC at all — nothing to dedupe against, skip

    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(buyer)
  }

  let mergedGroups = 0
  let deletedBuyers = 0
  let repointedInvoices = 0

  for (const [key, group] of groups) {
    if (group.length < 2) continue // no duplicates in this group

    const [survivor, ...duplicates] = group // oldest first (already sorted)
    const dupIds = duplicates.map(d => d.id)

    console.log(`\nGroup ${key}: keeping "${survivor.buyerName}" (${survivor.id}), merging ${dupIds.length} duplicate(s)`)

    const [updateResult] = await prisma.$transaction([
      prisma.invoice.updateMany({
        where: { buyerId: { in: dupIds } },
        data: { buyerId: survivor.id }
      }),
      prisma.buyer.deleteMany({
        where: { id: { in: dupIds } }
      })
    ])
    repointedInvoices += updateResult.count
    deletedBuyers += dupIds.length
    mergedGroups++
  }

  console.log(`\nDedupe complete.`)
  console.log(`Merged groups: ${mergedGroups}`)
  console.log(`Duplicate buyers deleted: ${deletedBuyers}`)
  console.log(`Invoices repointed to survivor: ${repointedInvoices}`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})