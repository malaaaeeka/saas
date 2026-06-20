/**
 * One-time seed script — run once to populate the hs_codes table.
 * Usage: npx ts-node src/scripts/seedHsCodes.ts
 *        (run from the backend folder, with the xlsm file path below)
 */
import prisma from '../config/database'
import * as fs from 'fs'
import * as path from 'path'
import AdmZip from 'adm-zip'
import { XMLParser } from 'fast-xml-parser'

const XLSM_PATH = path.resolve(__dirname, '../../../Sales_Invoice_Template__10___1_.xlsm')

async function extractHsCodes(): Promise<{ code: string; description: string; fullEntry: string }[]> {
  const zip = new AdmZip(XLSM_PATH)

  // Parse shared strings
  const ssXml = zip.readAsText('xl/sharedStrings.xml')
  const parser = new XMLParser({ ignoreAttributes: false, isArray: (name) => name === 'si' })
  const ss = parser.parse(ssXml)
  const strings: string[] = (ss.sst?.si || []).map((si: any) => {
    if (typeof si.t === 'string') return si.t
    if (Array.isArray(si.r)) return si.r.map((r: any) => r.t || '').join('')
    if (si.r?.t) return si.r.t
    return ''
  })

  // Parse REFERENCES sheet (sheet2)
  const sheetXml = zip.readAsText('xl/worksheets/sheet2.xml')
  const sheet = parser.parse(sheetXml)
  const rows = sheet.worksheet?.sheetData?.row || []

  const results: { code: string; description: string; fullEntry: string }[] = []

  for (const row of rows) {
    const rowNum = Number(row['@_r'] || 0)
    if (rowNum < 4) continue

    const cells = Array.isArray(row.c) ? row.c : row.c ? [row.c] : []
    for (const cell of cells) {
      const ref: string = cell['@_r'] || ''
      const colLetter = ref.replace(/[0-9]/g, '')
      if (colLetter !== 'R') continue

      const t = cell['@_t']
      const v = cell.v
      if (v === undefined || v === null) continue

      const fullEntry: string = t === 's' ? (strings[Number(v)] || '') : String(v)
      if (!fullEntry) continue

      // Split "0101.2100:-Description" into code and description
      const sepIdx = fullEntry.indexOf(':-')
      const code = sepIdx >= 0 ? fullEntry.slice(0, sepIdx).trim() : fullEntry.trim()
      const description = sepIdx >= 0 ? fullEntry.slice(sepIdx + 2).trim() : ''

      results.push({ code, description, fullEntry })
    }
  }

  return results
}

async function main() {
  console.log('Starting HS Code seed...')

  if (!fs.existsSync(XLSM_PATH)) {
    console.error(`xlsm file not found at: ${XLSM_PATH}`)
    console.error('Move the xlsm file to the root of the saas folder, or update XLSM_PATH in this script.')
    process.exit(1)
  }

  const hsCodes = await extractHsCodes()
  console.log(`Extracted ${hsCodes.length} HS codes from Excel`)

  // Wipe existing data and re-seed (idempotent)
  await prisma.hsCode.deleteMany()
  console.log('Cleared existing hs_codes table')

  // Insert in batches of 500 to avoid hitting Prisma limits
  const BATCH = 500
  for (let i = 0; i < hsCodes.length; i += BATCH) {
    await prisma.hsCode.createMany({ data: hsCodes.slice(i, i + BATCH) })
    console.log(`Inserted ${Math.min(i + BATCH, hsCodes.length)} / ${hsCodes.length}`)
  }

  console.log('Seed complete.')
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})