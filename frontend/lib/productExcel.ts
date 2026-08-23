import { needsSroReference, checkRequired, checkPositiveNumber } from '@/lib/fbrValidation'

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

    // ---- Description (required — matches manual) ----
    const description = get(col.description)
    const descErr = checkRequired(description, 'Product Description')
    if (descErr) errors.push(descErr)

    // ---- HS Code (required — matches manual) ----
    const hsCode = get(col.hsCode)
    const hsErr = checkRequired(hsCode, 'HS Code')
    if (hsErr) errors.push(hsErr)

    // ---- UoM (required — matches manual) ----
    const uom = get(col.uom)
    const uomErr = checkRequired(uom, 'UoM')
    if (uomErr) errors.push(uomErr)

    // ---- Rate (required AND must be > 0 — matches manual) ----
    const rateRaw = get(col.rate)
    let rate: number | null = null
    if (!rateRaw) {
      errors.push('Rate is required')
    } else {
      const n = Number(rateRaw)
      if (Number.isNaN(n)) {
        errors.push('Rate must be a number')
      } else {
        rate = n
        const rateErr = checkPositiveNumber(rate, 'Rate')
        if (rateErr) errors.push(rateErr)
      }
    }

    // ---- Tax Rate (required — matches manual) ----
    const taxRate = get(col.taxRate)
    const taxRateErr = checkRequired(taxRate, 'Tax Rate')
    if (taxRateErr) errors.push(taxRateErr)

    // ---- SRO / Item S.No. — required ONLY for exempt/reduced-rate items,
    // using the SAME needsSroReference() rule the manual form uses ----
    const sroSchedule = get(col.sroSchedule)
    const itemSNo = get(col.itemSNo)
    if (taxRate && needsSroReference(taxRate)) {
      if (!sroSchedule) errors.push('SRO No. / Schedule No. is required for exempt or reduced-rate items')
      if (!itemSNo) errors.push('Item S. No. is required for exempt or reduced-rate items')
    }

    return {
      rowNumber: i + 2,
      payload: {
        description,
        hsCode,
        hsCodeDescription: get(col.hsCodeDescription),
        uom,
        rate,
        taxRate,
        sroSchedule,
        itemSNo,
      },
      valid: errors.length === 0,
      errors,
    }
  })
}