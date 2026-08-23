import {
  needsSroReference,
  classifyBuyerIdColumns,
  checkRequired,
  checkPositiveNumber,
  checkBuyerType,
  checkProvince,
  DOCUMENT_TYPES,
  INVOICE_TYPES,
} from '@/lib/fbrValidation'

export const ALIAS_MAP: Record<string, string[]> = {
  sellerRegNo:         ['sellerregno', 'sellerregistrationno', 'sellerregistrationnumber', 'ntn', 'registrationno'],
  invoiceDate:         ['invoicedate', 'date'],
  invoiceType:         ['invoicetype'],
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
  uom: '',
  rate: 0,
  taxRate: '',
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

  // Group rows by Document Number — but track rows with a BLANK document
  // number as their own error group instead of silently dropping them,
  // so the preview table surfaces the problem instead of hiding data loss.
  const byDoc = new Map<string, any[]>()
  let blankDocNumberCount = 0
  for (const row of dataRows) {
    const key = String(get(row, 'documentNumber', '')).trim()
    if (!key) { blankDocNumberCount++; continue }
    if (!byDoc.has(key)) byDoc.set(key, [])
    byDoc.get(key)!.push(row)
  }

  const groups: InvoiceGroup[] = Array.from(byDoc.entries()).map(([documentNumber, rows]) => {
    const first = rows[0]
    const documentType = String(get(first, 'documentType', 'Sale Invoice'))
    const isAmendment = documentType === 'Credit Note' || documentType === 'Debit Note'

    const errors: string[] = []

    // ---- Item-level validation (mirrors validateForm's per-item checks) ----
    const items = rows.map((row, rowIdx) => {
      const quantity = Number(get(row, 'quantity', 0))
      const rate = Number(get(row, 'rate', 0))
      const taxRate = String(get(row, 'taxRate', ''))
      const uom = String(get(row, 'uom', ''))
      const hsCode = String(get(row, 'hsCode', ''))
      const description = String(get(row, 'productDescription', ''))
      const sroSchedule = String(get(row, 'sroSchedule', ''))
      const itemSNo = String(get(row, 'itemSNo', ''))
      const invoiceRefNo = String(get(row, 'invoiceRefNo', ''))
      const totalAmount = quantity * rate

      const pct = (() => {
        const m = taxRate.match(/^(\d+(\.\d+)?)%/)
        return m ? parseFloat(m[1]) / 100 : null
      })()

      const itemErr = checkRequired(hsCode, `Row ${rowIdx + 1}: HS Code`)
      if (itemErr) errors.push(itemErr)
      const descErr = checkRequired(description, `Row ${rowIdx + 1}: Product Description`)
      if (descErr) errors.push(descErr)
      const qtyErr = checkPositiveNumber(quantity || null, `Row ${rowIdx + 1}: Qty`)
      if (qtyErr) errors.push(qtyErr)
      const rateErr = checkPositiveNumber(rate || null, `Row ${rowIdx + 1}: Unit Price`)
      if (rateErr) errors.push(rateErr)
      const uomErr = checkRequired(uom, `Row ${rowIdx + 1}: UoM`)
      if (uomErr) errors.push(uomErr)
      const taxRateErr = checkRequired(taxRate, `Row ${rowIdx + 1}: Tax Rate`)
      if (taxRateErr) errors.push(taxRateErr)

      if (taxRate && needsSroReference(taxRate)) {
        if (!sroSchedule) errors.push(`Row ${rowIdx + 1}: SRO No. / Schedule No. required for exempt/reduced-rate items`)
        if (!itemSNo) errors.push(`Row ${rowIdx + 1}: Item S. No. required for exempt/reduced-rate items`)
      }

      if (isAmendment && !invoiceRefNo) {
        errors.push(`Row ${rowIdx + 1}: Invoice Reference No. required for ${documentType} (FBR col Y)`)
      }

      return {
        ...DEFAULT_ITEM,
        documentNumber,
        invoiceRefNo,
        hsCode,
        hsCodeDescription: String(get(row, 'hsCodeDescription', '')),
        description,
        quantity, rate, taxRate, totalAmount,
        salesTax: pct !== null ? totalAmount * pct : 0,
        uom,
        sroSchedule,
        itemSNo,
      }
    })

    // ---- Header-level validation (mirrors validateForm's top-level checks) ----
    const invoiceTypeRaw = String(get(first, 'invoiceType', 'SALE'))
    const invoiceType = INVOICE_TYPES.includes(invoiceTypeRaw) ? invoiceTypeRaw : ''
    if (!invoiceType) errors.push(`Invalid/missing Invoice Type (must be one of: ${INVOICE_TYPES.join(', ')})`)

    if (!DOCUMENT_TYPES.includes(documentType)) {
      errors.push(`Invalid/missing Document Type (must be one of: ${DOCUMENT_TYPES.join(', ')})`)
    }

    const originationRaw = String(get(first, 'originationProvince', ''))
    const { value: originationProvince, error: originErr } = checkProvince(originationRaw, true)
    if (originErr) errors.push(originErr)

    const destinationRaw = String(get(first, 'destinationProvince', ''))
    const { value: destinationProvince, error: destErr } = checkProvince(destinationRaw, true)
    if (destErr) errors.push(destErr)

    const buyerTypeRaw = String(get(first, 'buyerType', ''))
    const { value: buyerType, error: buyerTypeErr } = checkBuyerType(buyerTypeRaw)
    if (buyerTypeErr) errors.push(buyerTypeErr)

    const sellerRegNo = String(get(first, 'sellerRegNo', ''))
    const sellerErr = checkRequired(sellerRegNo, 'Seller Registration No.')
    if (sellerErr) errors.push(sellerErr)

    const buyerNtnRaw = String(get(first, 'buyerNtn', ''))
    const buyerCnicRaw = String(get(first, 'buyerCnic', ''))
    const idResult = classifyBuyerIdColumns(buyerNtnRaw, buyerCnicRaw)
    if (idResult.kind === 'none') errors.push('Missing Buyer NTN/CNIC')
    if (idResult.kind === 'both') errors.push('Provide only one of Buyer NTN or Buyer CNIC')
    if (idResult.kind === 'invalid') errors.push('Invalid Buyer NTN (7 digits) or CNIC (13 digits) format')

    if (items.length === 0) errors.push('No items')

    const payload = {
      sellerRegNo,
      invoiceDate: String(get(first, 'invoiceDate', '')),
      documentType,
      saleType: String(get(first, 'saleType', 'Goods at standard rate (default)')),
      invoiceType: invoiceType || invoiceTypeRaw,
      buyerName: String(get(first, 'buyerName', '')),
      buyerNtn: idResult.kind === 'ntn' ? idResult.value : '',
      buyerCnic: idResult.kind === 'cnic' ? idResult.value : '',
      buyerType,
      originationProvince,
      destinationProvince,
      items,
    }

    return { documentNumber, payload, valid: errors.length === 0, errors }
  })

  // Surface blank-document-number rows as a visible, skippable "group"
  // instead of silently vanishing — matches the manual form's philosophy
  // of always telling the user exactly what's wrong.
  if (blankDocNumberCount > 0) {
    groups.push({
      documentNumber: '(blank)',
      payload: { items: [] },
      valid: false,
      errors: [`${blankDocNumberCount} row(s) skipped — missing Document Number`],
    })
  }

  return groups
}