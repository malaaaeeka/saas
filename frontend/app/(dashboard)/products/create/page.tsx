'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import HsCodeAutocomplete from '@/components/ui/HsCodeAutocomplete'
import StyledSelect, { toOptions } from '@/components/ui/StyledSelect'

// ── Shared reference lists ──────────────────────────────────────────
// NOTE: these are duplicated from app/(dashboard)/invoices/create/page.tsx
// so this page has no dependency on it. If you'd rather keep one source
// of truth, move UOMS / RATES / SRO_SCHEDULES / ITEM_SR_NOS into a shared
// file (e.g. lib/fbrConstants.ts) and import them in both places.

const UOMS = [
  'MT', 'Bill of lading', 'SET', 'NO', '1000 kWh', 'KWH', '40KG', 'Liter',
  'SqY', 'Bag', 'KG', 'MMBTU', 'Meter', 'Carat', 'Cubic Metre', 'Dozen',
  'Gram', 'Gallon', 'Kilogram', 'Pound', 'Timber Logs', 'Packs', 'Pair',
  'Square Foot', 'Square Metre', 'Thousand Unit', 'Mega Watt', 'Foot',
  'Barrels', 'Numbers, pieces, units'
]

const RATES: string[] = [
  '0%', '0.20%', '0.25%', '0.46%', '0.50%', '0.79%', '1%', '1.43%', '1.5%',
  '1.63%', '2%', '2.5%', '2.7%', '2.74%', '3%', '3.17%', '3.67%', '4.5%',
  '4.77%', '5%', '5.3%', '5.44%', '6.5%', '6.7%', '6.75%', '6.84%', '7%',
  '7.2%', '7.37%', '7.5%', '7.56%', '8%', '8.19%', '8.3%', '8.5%', '9.08%',
  '9.15%', '10%', '10.07%', '10.32%', '10.54%', '10.77%', '11.64%', '12%',
  '12.5%', '12.75%', '13%', '14%', '15%', '15.44%', '16%', '16.4%', '17%',
  '18%', '18.5%', '19.5%', '20%', '25%',
  '100/SqY', '17% along with rupees 60 per kilogram',
  '18% along with rupees 60 per kilogram', '17% along with rupees 90 per kilogram',
  '200/bill', '50/SqY', 'DTRE', 'Exempt'
]

const SRO_SCHEDULES: string[] = [
  '',
  "01(I)/2022", "1007(I)/2005", "1125(I)/2011", "1167(I)/2018", "1180(I)/2016",
  "1212(I)/2018", "125(I)/2017", "1308(I)/2018", "1450(I)/2021", "1579(1)/2021",
  "1604(I)/2021", "1636(1)/2022", "164(I)/2010", "172(I)/2006", "183(I)/2022",
  "188(I)/2015", "1st Schedule FED", "21(I)/2017", "213(I)/2013", "223(I)/2017",
  "237(I)/2020", "253(I)/2019", "292(I)/2017", "297(I)/2023-Table-I",
  "297(I)/2023-Table-II", "321(I)/2022", "326(I)/2008", "327(I)/2008",
  "398(I)/2015", "3rd Schd Table II", "3rd Schedule goods", "408(I)/2012",
  "408(I)/2017", "484(I)/2015", "495(I)/2016", "499(I)/2013", "501(I)/2013",
  "525(I)/2008", "539(I)/2008", "542(I)/2008", "549(I)/2008", "551(I)/2008",
  "572(I)/2014", "581(1)/2024", "581(I)/2017", "587(I)/2017", "590(I)/2017",
  "5th Schedule", "608(I)/2012", "641(I)/2017", "646(I)/2005", "657(I)/2013",
  "670(I)/2013", "678(I)/2004", "6th Schd Table I", "6th Schd Table II",
  "6th Schd Table III", "6th Schedule", "713(I)/2017", "727(I)/2011",
  "757(I)/2017", "76(I)/2008", "760(I)/2012", "777(I)2018", "781(I)2018",
  "79(I)/2012", "802(I)/2009", "811(I)/2009", "863(I)/2007", "867(I)/2017",
  "88(I)/2022", "880(I)/2007", "896(I)/2013", "898(I)/2013", "8th Schedules",
  "91(I)/2017", "946(1)/2013", "984(I)/2017", "9th Schedule", "9th Schedules",
  "DTRE", "EIGHTH SCHEDULE Table 1", "EIGHTH SCHEDULE Table 2",
  "FED 3rd Schd Table I", "FED 3rd Schd Table II", "FIFTH SCHEDULE", "ICTO",
  "ICTO TABLE I", "ICTO TABLE II", "NINTH SCHEDULE", "Section 4(b)",
  "SECTION 49", "SRO 342 (I)/2002", "Zero Rated Elec.", "Zero Rated Gas",
  "S.R.O. 1217(I)/2025"
]

const ITEM_SR_NOS: string[] = [
  '',
  "-", "1", "1(A)", "1(B)", "1(E)", "1(F)", "1(G)", "1(i)", "1(i)(a)", "1(i)(b)",
  // ...(paste the rest of the ITEM_SR_NOS array exactly as it appears in Document 2)...
  "Region-I", "Region-II"
]

const EMPTY_FORM = {
  description: '',
  hsCode: '',
  hsCodeDescription: '',
  uom: '',
  rate: '',
  taxRate: '',
  sroSchedule: '',
  itemSNo: ''
}

// Fields that MUST be filled because every invoice line depends on them
// (see handleProductSelect in invoices/create/page.tsx — these are the
// values that flow straight into totalAmount / salesTax calculations).
type FormErrors = Partial<Record<keyof typeof EMPTY_FORM, boolean>>

function validate(form: typeof EMPTY_FORM): FormErrors {
  const errors: FormErrors = {}
  if (!form.description.trim()) errors.description = true
  if (!form.hsCode.trim()) errors.hsCode = true
  if (!form.uom.trim()) errors.uom = true
  if (!form.rate.trim()) errors.rate = true
  if (!form.taxRate.trim()) errors.taxRate = true
  // sroSchedule / itemSNo intentionally NOT required — they only matter
  // for exempt / zero-rated / reduced-rate items, same as on the invoice form.
  return errors
}

function CreateProductPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(!!editId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)

  const errorBoxRef = useRef<HTMLDivElement>(null)
  const descriptionRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }
    if (!editId) return

    setLoading(true)
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/${editId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const p = data.data
          setForm({
            description: p.description || '',
            hsCode: p.hsCode || '',
            hsCodeDescription: p.hsCodeDescription || '',
            uom: p.uom || '',
            rate: p.rate !== null && p.rate !== undefined ? String(p.rate) : '',
            taxRate: p.taxRate || '',
            sroSchedule: p.sroSchedule || '',
            itemSNo: p.itemSNo || ''
          })
        } else {
          setError('Could not load product for editing')
        }
      })
      .catch(() => setError('Failed to load product'))
      .finally(() => setLoading(false))
  }, [editId, router])

  const handleChange = (field: keyof typeof EMPTY_FORM, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleHsCodeSelect = (code: string, description: string) => {
    setForm(prev => ({ ...prev, hsCode: code, hsCodeDescription: `${code}:-${description}` }))
  }

  const errors = validate(form)
  const hasErrors = Object.keys(errors).length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAttemptedSubmit(true)
    setError('')

    if (hasErrors) {
      setError('Please fill in all required fields (Description, HS Code, UoM, Rate, Tax Rate)')
      setTimeout(() => {
        errorBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const url = editId
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/products/${editId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/products`
      const method = editId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          description: form.description,
          hsCode: form.hsCode,
          hsCodeDescription: form.hsCodeDescription,
          uom: form.uom,
          rate: form.rate ? Number(form.rate) : null,
          taxRate: form.taxRate,
          sroSchedule: form.sroSchedule,
          itemSNo: form.itemSNo
        })
      })
      const data = await res.json()
      if (data.success) {
        router.push('/products')
      } else {
        setError(data.message || 'Failed to save product')
        setTimeout(() => errorBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
      }
    } catch {
      setError('Cannot reach server')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-heading p-8">
      <div className="max-w-3xl mx-auto">

        <div className="mb-8">
          <button onClick={() => router.push('/products')} className="text-muted hover:text-heading text-sm mb-2 flex items-center gap-1 transition">
            ← Back
          </button>
          <h1 className="text-3xl font-bold mb-2">{editId ? 'Edit Product' : 'Add Product'}</h1>
          <p className="text-muted">
            Fields marked * are required on every invoice line, so they&apos;re required here too.
          </p>
        </div>

        {error && (
          <div ref={errorBoxRef} className="bg-surface border border-border border-l-4 border-l-red-500 rounded-xl px-4 py-3 mb-6 shadow-sm flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 flex-shrink-0" />
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {loading ? (
          <p className="text-muted">Loading product...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">

            <div className="bg-surface rounded-xl p-6 border border-border shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Product Details</h2>

              <div className="mb-4">
                <label className="block text-sm text-muted mb-2">Product Description *</label>
                <input
                  ref={descriptionRef}
                  type="text"
                  value={form.description}
                  onChange={e => handleChange('description', e.target.value)}
                  placeholder="e.g. Cotton Yarn 30/1"
                  className={`w-full bg-surface border text-heading rounded-lg px-4 py-2 focus:outline-none focus:border-accent ${
                    attemptedSubmit && errors.description ? 'border-red-500 ring-1 ring-red-500' : 'border-border'
                  }`}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-muted mb-2">Product Description *</label>
                  <input
                    ref={descriptionRef}
                    type="text"
                    value={form.description}
                    onChange={e => handleChange('description', e.target.value)}
                    placeholder="e.g. Cotton Yarn 30/1"
                    className={`w-full bg-surface border text-heading rounded-lg px-4 py-2 focus:outline-none focus:border-accent ${
                      attemptedSubmit && errors.description ? 'border-red-500 ring-1 ring-red-500' : 'border-border'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm text-muted mb-2">
                    HS Code Description *
                    {form.hsCode && <span className="ml-2 text-link font-mono">{form.hsCode}</span>}
                  </label>
                  <div className={attemptedSubmit && errors.hsCode ? 'rounded-lg ring-1 ring-red-500' : ''}>
                    <HsCodeAutocomplete
                      value={form.hsCodeDescription}
                      onSelect={(code, desc) => handleHsCodeSelect(code, desc)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-2">UoM *</label>
                  <div className={attemptedSubmit && errors.uom ? 'rounded-lg ring-2 ring-red-500' : ''}>
                    <StyledSelect
                      options={toOptions(UOMS)}
                      value={form.uom ? { value: form.uom, label: form.uom } : null}
                      onChange={opt => handleChange('uom', opt?.value || '')}
                      placeholder="Select unit of measurement"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-muted mb-2">Unit Price (PKR) *</label>
                  <input
                    type="number"
                    value={form.rate}
                    onChange={e => handleChange('rate', e.target.value)}
                    placeholder="0.00"
                    className={`w-full bg-surface border text-heading rounded-lg px-4 py-2 focus:outline-none focus:border-accent ${
                      attemptedSubmit && errors.rate ? 'border-red-500 ring-1 ring-red-500' : 'border-border'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-2">Tax Rate *</label>
                  <div className={attemptedSubmit && errors.taxRate ? 'rounded-lg ring-2 ring-red-500' : ''}>
                    <StyledSelect
                      options={toOptions(RATES)}
                      value={form.taxRate ? { value: form.taxRate, label: form.taxRate } : null}
                      onChange={opt => handleChange('taxRate', opt?.value || '')}
                      placeholder="Select tax rate"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-xl p-6 border border-border shadow-sm">
              <h2 className="text-lg font-semibold mb-1">Exemption / Zero &amp; Reduced Rate Reference</h2>
              <p className="text-muted text-sm mb-4">Only needed if this product is exempt, zero-rated, or reduced-rate.</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-2">SRO No. / Schedule No.</label>
                  <StyledSelect
                    options={toOptions(SRO_SCHEDULES.filter(Boolean))}
                    value={form.sroSchedule ? { value: form.sroSchedule, label: form.sroSchedule } : null}
                    onChange={opt => handleChange('sroSchedule', opt?.value || '')}
                    placeholder="None"
                    isClearable
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-2">Item S. No.</label>
                  <StyledSelect
                    options={toOptions(ITEM_SR_NOS.filter(Boolean))}
                    value={form.itemSNo ? { value: form.itemSNo, label: form.itemSNo } : null}
                    onChange={opt => handleChange('itemSNo', opt?.value || '')}
                    placeholder="None"
                    isClearable
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-start">
              <button
                type="submit"
                disabled={saving}
                className="bg-btn-dark hover:bg-btn-dark-hover disabled:opacity-50 text-btn-dark-text font-semibold py-3 px-8 rounded-lg transition"
              >
                {saving ? 'Saving...' : editId ? 'Save Changes' : 'Save Product'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/products')}
                className="bg-surface border border-border hover:border-heading text-heading font-semibold py-3 px-8 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function CreateProductPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background text-heading flex items-center justify-center">
        Loading...
      </div>
    }>
      <CreateProductPageContent />
    </Suspense>
  )
}