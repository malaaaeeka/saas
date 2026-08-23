import { classifyBuyerIdColumns, checkBuyerType, checkProvince, checkRequired } from '@/lib/fbrValidation'

export interface BuyerPayload {
  buyerName: string
  buyerNtn: string
  buyerCnic: string
  buyerType: string
  province: string
  address: string
  phone: string
  email: string
}

export interface BuyerRow {
  rowNumber: number
  payload: BuyerPayload
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

export function parseBuyerRows(dataRows: any[][], rawHeaders: string[]): BuyerRow[] {
  const col = {
    name: findCol(rawHeaders, 'Buyer Name', 'Name'),
    ntn: findCol(rawHeaders, 'NTN'),
    cnic: findCol(rawHeaders, 'CNIC'),
    type: findCol(rawHeaders, 'Buyer Type', 'Type'),
    province: findCol(rawHeaders, 'Province'),
    address: findCol(rawHeaders, 'Address'),
    phone: findCol(rawHeaders, 'Phone'),
    email: findCol(rawHeaders, 'Email'),
  }

  return dataRows.map((row, i) => {
    const get = (idx: number) => (idx === -1 ? '' : String(row[idx] ?? '').trim())
    const errors: string[] = []

    const buyerName = get(col.name)
    const nameErr = checkRequired(buyerName, 'Buyer Name')
    if (nameErr) errors.push(nameErr)

    const idResult = classifyBuyerIdColumns(get(col.ntn), get(col.cnic))
    if (idResult.kind === 'none') errors.push('Missing NTN/CNIC')
    if (idResult.kind === 'both') errors.push('Provide only one of NTN or CNIC')
    if (idResult.kind === 'invalid') errors.push('Invalid NTN (7 digits) or CNIC (13 digits)')

    const { value: buyerType, error: typeErr } = checkBuyerType(get(col.type))
    if (typeErr) errors.push(typeErr)

    const { value: province, error: provinceErr } = checkProvince(get(col.province), false)
    if (provinceErr) errors.push(provinceErr)

    return {
      rowNumber: i + 2,
      payload: {
        buyerName,
        buyerNtn: idResult.kind === 'ntn' ? idResult.value : '',
        buyerCnic: idResult.kind === 'cnic' ? idResult.value : '',
        buyerType, province,
        address: get(col.address), phone: get(col.phone), email: get(col.email),
      },
      valid: errors.length === 0,
      errors,
    }
  })
}