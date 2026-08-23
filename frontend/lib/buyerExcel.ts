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

const BUYER_TYPES = ['Registered', 'Unregistered', 'Unregistered Distributor', 'Retail Consumer']
const PROVINCES = [
  'AZAD JAMMU AND KASHMIR', 'BALOCHISTAN', 'CAPITAL TERRITORY', 'GILGIT BALTISTAN',
  'KHYBER PAKHTUNKHWA', 'PUNJAB', 'SINDH', 'FATA/PATA'
]

function onlyDigits(v: string): string {
  return String(v || '').replace(/\D/g, '')
}
function normalizeCnic(v: string): string {
  const d = onlyDigits(v)
  if (d.length !== 13) return v
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`
}
function classifyId(ntnRaw: string, cnicRaw: string) {
  const ntnDigits = onlyDigits(ntnRaw)
  const cnicDigits = onlyDigits(cnicRaw)
  if (ntnDigits && cnicDigits) return { kind: 'both' as const, value: '' }
  if (ntnDigits) return /^\d{7}$/.test(ntnDigits) ? { kind: 'ntn' as const, value: ntnDigits } : { kind: 'invalid' as const, value: '' }
  if (cnicDigits) return cnicDigits.length === 13 ? { kind: 'cnic' as const, value: normalizeCnic(cnicRaw) } : { kind: 'invalid' as const, value: '' }
  return { kind: 'none' as const, value: '' }
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
    if (!buyerName) errors.push('Missing Buyer Name')

    const idResult = classifyId(get(col.ntn), get(col.cnic))
    if (idResult.kind === 'none') errors.push('Missing NTN/CNIC')
    if (idResult.kind === 'both') errors.push('Provide only one of NTN or CNIC')
    if (idResult.kind === 'invalid') errors.push('Invalid NTN (7 digits) or CNIC (13 digits)')

    const buyerType = BUYER_TYPES.find(t => t.toLowerCase() === get(col.type).toLowerCase()) || ''
    if (!buyerType) errors.push(`Invalid/missing Buyer Type (${BUYER_TYPES.join(', ')})`)

    const provinceRaw = get(col.province)
    const province = PROVINCES.find(p => p.toLowerCase() === provinceRaw.toLowerCase()) || ''
    if (provinceRaw && !province) errors.push('Unrecognized Province')

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