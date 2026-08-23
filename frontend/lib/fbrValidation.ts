// ===== Shared FBR validation & reference data =====
// Single source of truth for both manual entry forms and bulk Excel upload.
// If a rule changes, change it here ONCE — every form and every bulk parser
// picks it up automatically instead of drifting out of sync.

export const BUYER_TYPES = [
  'Registered', 'Unregistered', 'Unregistered Distributor', 'Retail Consumer'
]

export const PROVINCES = [
  'AZAD JAMMU AND KASHMIR', 'BALOCHISTAN', 'CAPITAL TERRITORY', 'GILGIT BALTISTAN',
  'KHYBER PAKHTUNKHWA', 'PUNJAB', 'SINDH', 'FATA/PATA'
]

export const DOCUMENT_TYPES = ['Sale Invoice', 'Credit Note', 'Debit Note', 'STWH']

export const INVOICE_TYPES = ['SALE', 'PURCHASE', 'DEBIT_NOTE', 'CREDIT_NOTE']

// Keep in sync with the RATES / UOMS / SRO_SCHEDULES / ITEM_SR_NOS arrays
// used in the manual forms if you want bulk uploads to be restricted to the
// exact same dropdown values. Left open here (any non-empty string) since
// SRO schedules/HS codes are large reference lists — tighten if needed.

const NTN_REGEX = /^\d{7}$/
const CNIC_REGEX = /^\d{5}-?\d{7}-?\d{1}$/

export function onlyDigits(v: string): string {
  return String(v || '').replace(/\D/g, '')
}

export function normalizeCnic(v: string): string {
  const d = onlyDigits(v)
  if (d.length !== 13) return v
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`
}

/** Classifies a single raw NTN/CNIC input string (used by manual single-field forms). */
export function classifyBuyerId(v: string): 'ntn' | 'cnic' | 'invalid' | 'incomplete' {
  const digits = onlyDigits(v)
  if (digits.length === 0) return 'incomplete'
  if (NTN_REGEX.test(digits)) return 'ntn'
  if (CNIC_REGEX.test(v) || digits.length === 13) return 'cnic'
  if (digits.length < 7) return 'incomplete'
  if (digits.length > 7 && digits.length < 13) return 'incomplete'
  return 'invalid'
}

/** Classifies separate NTN/CNIC columns (used by bulk Excel rows, which have two columns). */
export function classifyBuyerIdColumns(
  ntnRaw: string,
  cnicRaw: string
): { kind: 'ntn' | 'cnic' | 'invalid' | 'both' | 'none'; value: string } {
  const ntnDigits = onlyDigits(ntnRaw)
  const cnicDigits = onlyDigits(cnicRaw)
  if (ntnDigits && cnicDigits) return { kind: 'both', value: '' }
  if (ntnDigits) {
    return NTN_REGEX.test(ntnDigits)
      ? { kind: 'ntn', value: ntnDigits }
      : { kind: 'invalid', value: '' }
  }
  if (cnicDigits) {
    return cnicDigits.length === 13
      ? { kind: 'cnic', value: normalizeCnic(cnicRaw) }
      : { kind: 'invalid', value: '' }
  }
  return { kind: 'none', value: '' }
}

export function rateToPercent(rate: string): number | null {
  const match = String(rate || '').match(/^(\d+(\.\d+)?)%/)
  if (match) return parseFloat(match[1]) / 100
  return null
}

/**
 * True when the selected tax rate means the item is exempt, zero-rated,
 * DTRE, or below the standard 18% rate — these are the cases where FBR
 * requires a supporting SRO/Schedule reference and clause (Item S. No.)
 * to justify the non-standard rate. MUST match manual forms exactly.
 */
export function needsSroReference(taxRate: string): boolean {
  if (taxRate === 'Exempt' || taxRate === 'DTRE') return true
  const pct = rateToPercent(taxRate)
  if (pct !== null && pct < 0.18) return true
  return false
}

export function toNum(v: any): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

// ===== Reusable field-level checks (return an error string or null) =====
// Each of these mirrors a check your manual forms already perform.
// Bulk parsers call these instead of re-implementing the rule.

export function checkRequired(value: string, label: string): string | null {
  return String(value || '').trim() ? null : `Missing ${label}`
}

export function checkPositiveNumber(value: number | null, label: string): string | null {
  return value !== null && value > 0 ? null : `${label} must be greater than 0`
}

export function checkBuyerType(value: string): { value: string; error: string | null } {
  const match = BUYER_TYPES.find(t => t.toLowerCase() === value.trim().toLowerCase())
  if (!value.trim()) return { value: '', error: 'Missing Buyer Type' }
  if (!match) return { value: '', error: `Invalid Buyer Type (must be one of: ${BUYER_TYPES.join(', ')})` }
  return { value: match, error: null }
}

export function checkProvince(value: string, required: boolean): { value: string; error: string | null } {
  const raw = value.trim()
  if (!raw) return { value: '', error: required ? 'Missing Province' : null }
  const match = PROVINCES.find(p => p.toLowerCase() === raw.toLowerCase())
  if (!match) return { value: '', error: `Unrecognized Province (must be one of: ${PROVINCES.join(', ')})` }
  return { value: match, error: null }
}