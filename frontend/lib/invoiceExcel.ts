
export const ALIAS_MAP: Record<string, string[]> = {
  sellerRegNo:         ['sellerregno', 'sellerregistrationno', 'sellerregistrationnumber', 'ntn', 'registrationno'],
  invoiceDate:         ['invoicedate', 'date'],
  documentType:        ['documenttype', 'invoicedocumenttype'],
  saleType:            ['saletype'],
  originationProvince: ['originationprovince', 'saleoriginationprovince', 'originprovince'],
  destinationProvince: ['destinationprovince', 'destinationofsupply'],
  buyerName:           ['buyername', 'name'],
  buyerNtn:            ['buyerntn', 'buyerregistrationno'],
  buyerCnic:           ['buyercnic', 'cnic'],
  buyerType:           ['buyertype'],
  documentNumber:      ['documentnumber', 'docnumber', 'invoiceno', 'invoicenumber'],
  invoiceRefNo:        ['invoicerefno', 'invoicereferenceno', 'originalinvoiceno'],
  hsCode:              ['hscode'],
  hsCodeDescription:   ['hscodedescription'],
  productDescription:  ['productdescription', 'description', 'productname'],
  quantity:            ['quantity', 'qty', 'quantitysupplied'],
  uom:                 ['uom', 'unit', 'unitofmeasurement'],
  rate:                ['rate', 'unitprice', 'price'],
  taxRate:             ['taxrate', 'salestaxrate', 'rateoftax'],
  fixedNotifiedValue:  ['fixednotifiedvalue', 'fixedvalue', 'notifiedvalue', 'retailprice'],
  extraTax:            ['extratax'],
  furtherTax:          ['furthertax'],
  pfadValue:           ['pfadvalue', 'totalvaluepfad'],
  stWithheld:          ['stwithheld', 'salestaxwithheld'],
  fed:                 ['fed'],
  withholdingTax:      ['withholdingtax'],
  discount:            ['discount'],
  sroSchedule:         ['sroschedule', 'sronoschedule', 'sronoscheduleno'],
  itemSNo:             ['itemsno', 'itemserialno', 'clauseno'],
  reason:              ['reason'],
  reasonRemarks:       ['reasonremarks', 'remarks'],
}

export const REQUIRED_FIELDS = ['sellerRegNo', 'quantity', 'rate', 'documentNumber'] as const

export const NUMERIC_ITEM_FIELDS = [
  'quantity', 'rate', 'totalAmount', 'salesTax', 'fixedNotifiedValue',
  'extraTax', 'furtherTax', 'pfadValue', 'stWithheld', 'fed',
  'withholdingTax', 'discount'
] as const

export const DEFAULT_ITEM = {
  documentNumber: '',
  invoiceRefNo: '',
  hsCode: '',
  hsCodeDescription: '',
  productCode: '',
  description: '',
  quantity: 0,
  uom: 'KG',
  rate: 0,
  taxRate: '18%',
  totalAmount: 0,
  salesTax: 0,
  fixedNotifiedValue: 0,
  extraTax: 0,
  furtherTax: 0,
  pfadValue: 0,
  stWithheld: 0,
  sroSchedule: '',
  itemSNo: '',
  reason: '',
  reasonRemarks: '',
  petroleumLevyOn: 'Direct Sale',
  fed: 0,
  withholdingTax: 0,
  discount: 0
}

export function normalizeHeader(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function buildHeaderIndex(rawHeaders: string[]): Record<string, string> {
  const index: Record<string, string> = {}
  for (const header of rawHeaders) {
    const norm = normalizeHeader(header)
    for (const [field, aliases] of Object.entries(ALIAS_MAP)) {
      if (index[field]) continue
      if (aliases.includes(norm)) {
        index[field] = header
      }
    }
  }
  return index
}

export function rateToPercent(rate: string): number | null {
  const match = rate.match(/^(\d+(\.\d+)?)%/)
  if (match) return parseFloat(match[1]) / 100
  return null
}

export function toNum(v: any): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

// ===== Bulk upload grouping =====

export type InvoiceGroup = {
  documentNumber: string
  payload: any
  valid: boolean
  errors: string[]
}

export function groupRowsIntoInvoices(dataRows: any[][], rawHeaders: string[]): InvoiceGroup[] {
  const headerIndex = buildHeaderIndex(rawHeaders)
  const get = (row: any[], field: string, fallback: any = '') => {
    const header = headerIndex[field]
    if (!header) return fallback
    const val = row[rawHeaders.indexOf(header)]
    return val === undefined || val === '' ? fallback : val
  }

  const byDoc = new Map<string, any[]>()
  for (const row of dataRows) {
    const key = String(get(row, 'documentNumber', '')).trim()
    if (!key) continue
    if (!byDoc.has(key)) byDoc.set(key, [])
    byDoc.get(key)!.push(row)
  }

  return Array.from(byDoc.entries()).map(([documentNumber, rows]) => {
    const first = rows[0]
    const items = rows.map(row => {
      const quantity = Number(get(row, 'quantity', 0))
      const rate = Number(get(row, 'rate', 0))
      const taxRate = String(get(row, 'taxRate', '18%'))
      const totalAmount = quantity * rate
      const pct = rateToPercent(taxRate)
      return {
        ...DEFAULT_ITEM,
        documentNumber,
        hsCode: String(get(row, 'hsCode', '')),
        hsCodeDescription: String(get(row, 'hsCodeDescription', '')),
        description: String(get(row, 'productDescription', '')),
        quantity, rate, taxRate, totalAmount,
        salesTax: pct !== null ? totalAmount * pct : 0,
        uom: String(get(row, 'uom', 'KG')),
      }
    })

   const payload = {
  sellerRegNo: String(get(first, 'sellerRegNo', '')),
  invoiceDate: String(get(first, 'invoiceDate', '')),
  documentType: String(get(first, 'documentType', 'Sale Invoice')),
  saleType: String(get(first, 'saleType', 'Goods at standard rate (default)')),
  invoiceType: String(get(first, 'invoiceType', 'SALE')),
  buyerName: String(get(first, 'buyerName', '')),
  buyerNtn: String(get(first, 'buyerNtn', '')),
  buyerCnic: String(get(first, 'buyerCnic', '')),
  buyerType: String(get(first, 'buyerType', 'Unregistered')),
  originationProvince: String(get(first, 'originationProvince', '')),
  destinationProvince: String(get(first, 'destinationProvince', '')),
  items,
}

    const errors: string[] = []
    if (!payload.sellerRegNo) errors.push('Missing Seller Reg No')
    if (!payload.buyerNtn && !payload.buyerCnic) errors.push('Missing Buyer NTN/CNIC')
    if (!payload.originationProvince) errors.push('Missing Origination Province')
    if (!payload.destinationProvince) errors.push('Missing Destination Province')
    if (items.length === 0) errors.push('No items')

    return { documentNumber, payload, valid: errors.length === 0, errors }
  })
}