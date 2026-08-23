export interface ProductPayload {
  description: string
  hsCode: string
  hsCodeDescription: string
  uom: string
  rate: number | null
  taxRate: string
  sroSchedule: string
  itemSNo: string
}

export interface ProductRow {
  rowNumber: number
  payload: ProductPayload
  valid: boolean
  errors: string[]
}

function findCol(headers: string[], ...names: string[]): number {
  const norm = headers.map(h => h.trim().toLowerCase())
  for (const name of names) {
    const idx = norm.indexOf(name.toLowerCase())
    if (idx !== -1) return idx
  }
  return -1
}

export function parseProductRows(dataRows: any[][], rawHeaders: string[]): ProductRow[] {
  const col = {
    description: findCol(rawHeaders, 'Description', 'Product Description'),
    hsCode: findCol(rawHeaders, 'HS Code'),
    hsCodeDescription: findCol(rawHeaders, 'HS Code Description'),
    uom: findCol(rawHeaders, 'UoM', 'Unit of Measure'),
    rate: findCol(rawHeaders, 'Rate (PKR)', 'Rate'),
    taxRate: findCol(rawHeaders, 'Tax Rate'),
    sroSchedule: findCol(rawHeaders, 'SRO No. / Schedule No.', 'SRO Schedule', 'SRO'),
    itemSNo: findCol(rawHeaders, 'Item S. No.', 'Item SNo'),
  }

  return dataRows.map((row, i) => {
    const get = (idx: number) => (idx === -1 ? '' : String(row[idx] ?? '').trim())
    const errors: string[] = []

    const description = get(col.description)
    if (!description) errors.push('Missing Description')

    const rateRaw = get(col.rate)
    let rate: number | null = null
    if (rateRaw) {
      const n = Number(rateRaw)
      if (Number.isNaN(n)) {
        errors.push('Rate must be a number')
      } else {
        rate = n
      }
    }

    return {
      rowNumber: i + 2,
      payload: {
        description,
        hsCode: get(col.hsCode),
        hsCodeDescription: get(col.hsCodeDescription),
        uom: get(col.uom),
        rate,
        taxRate: get(col.taxRate),
        sroSchedule: get(col.sroSchedule),
        itemSNo: get(col.itemSNo),
      },
      valid: errors.length === 0,
      errors,
    }
  })
}