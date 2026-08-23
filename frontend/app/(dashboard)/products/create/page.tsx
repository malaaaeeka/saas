'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import HsCodeAutocomplete from '@/components/ui/HsCodeAutocomplete'
import StyledSelect, { toOptions } from '@/components/ui/StyledSelect'

// ── Shared reference lists ──────────────────────────────────────────
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

// ⚠️ TODO: replace this with the FULL ITEM_SR_NOS array from your invoice page
// (300+ entries) — this placeholder only has a few for now.
const ITEM_SR_NOS: string[] = [
  '',
  "-", "1", "1(A)", "1(B)", "1(E)", "1(F)", "1(G)", "1(i)", "1(i)(a)", "1(i)(b)",
  "1(i)(i)", "1(ii)", "1(ii)(a)", "1(ii)(b)", "1(ii)(ii)(a)", "1(ii)(ii)(b)",
  "1(iii)", "1(iv)", "1(v)", "1(vi)", "10", "100", "100A", "100A((i))",
  "100A((ii))", "100A((iii))", "100B", "100B((i))", "100B((ii))", "100B((iii))",
  "100B((iv))", "100B((v))", "100B((vi))", "100C", "101", "102", "103", "104",
  "104(a)", "104(b)", "104(c)", "104(d)", "104(e)", "104(f)", "104(g)", "104(h)",
  "105", "106", "107", "108", "108(a)", "108(b)", "108(c)", "108(d)", "108(e)",
  "108(f)", "108(g)", "108(h)", "108(i)", "108(j)", "108(k)", "109", "11",
  "11(a)", "11(b)", "11(i)", "11(ii)", "11(iii)", "11(iv)", "11(v)", "11(vi)",
  "11(vii)", "11(viii)", "110", "110(a)", "110(b)", "110(c)", "110(d)", "110(e)",
  "110(f)", "110(g)", "110(h)", "110(i)", "110(j)", "111", "112", "112A",
  "112A(i)", "112A(ii)", "112A(iii)", "112A(iv)", "112A(ix)", "112A(v)",
  "112A(vi)", "112A(vii)", "112A(viii)", "112A(x)", "112A(xi)", "112A(xii)",
  "112A(xiii)", "112A(xiv)", "112A(xix)", "112A(xv)", "112A(xvi)", "112A(xvii)",
  "112A(xviii)", "112A(xx)", "112A(xxi)", "112A(xxii)", "112A(xxiii)",
  "112A(xxiv)", "112A(xxv)", "112B", "112B(i)", "112B(ii)", "112B(iii)",
  "112B(iv)", "112B(v)", "112B(vi)", "112B(vii)", "112C", "112C(i)", "112C(ii)",
  "112C(iii)", "112C(iv)", "112C(ix)", "112C(v)", "112C(vi)", "112C(vii)",
  "112C(viii)", "112C(x)", "112D", "112E", "112F", "112G", "112H", "112H(i)",
  "112H(ii)", "112H(iii)", "112H(iv)", "112H(ix)", "112H(v)", "112H(vi)",
  "112H(vii)", "112H(viii)", "112H(x)", "112H(xi)", "112I", "112I(i)", "112J",
  "112J(i)", "112J(ii)", "112J(iii)", "112J(iv)", "112J(ix)", "112J(v)",
  "112J(vi)", "112J(vii)", "112J(viii)", "112J(viii)(a)", "112J(viii)(b)",
  "112J(viii)(c)", "112J(x)", "112J(xi)", "112J(xii)", "112K", "112K(i)",
  "112K(ii)", "112K(iii)", "112K(iv)", "112K(ix)", "112K(v)", "112K(vi)",
  "112K(vii)", "112K(viii)", "112K(x)", "112K(xi)", "112K(xii)", "112K(xiii)",
  "112K(xiv)", "112K(xv)", "112K(xvi)", "112K(xvii)", "112K(xviii)", "112L",
  "113", "113(i)", "113(ii)", "113(iii)", "114", "114(i)", "114(ii)", "115",
  "116", "117", "118", "119", "12", "12(xix)", "12(xvii)", "12(xx)", "12(xxi)",
  "12(xxii)", "12(xxiii)", "12(xxiv)", "12(xxv)", "12(xxvi)", "12(xxvii)",
  "120", "121", "122", "123", "124", "125", "126", "127", "128", "129", "13",
  "130", "131", "132", "133", "134", "135", "136", "137", "138", "139", "14",
  "14(1)", "14(1)(i)", "14(1)(ii)", "14(1)(iii)", "14(1)(iv)", "14(1)(v)",
  "14(1)(vi)", "14(2)", "140", "141", "142", "143", "143(i)", "143(i)(a)",
  "143(i)(b)", "143(i)(c)", "143(i)(d)", "144", "145", "145(i)", "145(ii)",
  "145(iii)", "145(iv)", "145(ix)", "145(v)", "145(vi)", "145(vii)", "145(viii)",
  "145(x)", "146", "146(a)", "146(b)", "146(c)", "146(d)", "146(e)", "146(f)",
  "146(g)", "146(h)", "146(i)", "146(j)", "147", "148", "149", "14A", "14A(10)",
  "14A(11)", "14A(12)", "14A(12a)", "14A(12b)", "14A(12b)(i)", "14A(12b)(ii)",
  "14A(12b)(iii)", "14A(12b)(iv)", "14A(12b)(v)", "14A(12b)(vi)", "14A(13)",
  "14A(14)", "14A(14)(i)", "14A(14)(ii)", "14A(14)(iii)", "14A(14)(iv)",
  "14A(14)(ix)", "14A(14)(v)", "14A(14)(vi)", "14A(14)(vii)", "14A(14)(viii)",
  "14A(14)(x)", "14A(1a)", "14A(1b)", "14A(1b)(i)", "14A(1b)(ii)", "14A(1b)(iii)",
  "14A(1b)(iv)", "14A(1b)(v)", "14A(1b)(vi)", "14A(2a)", "14A(2b)", "14A(2b)(i)",
  "14A(2b)(ii)", "14A(2b)(iii)", "14A(2b)(iv)", "14A(2b)(v)", "14A(3a)",
  "14A(3b)", "14A(3b)(i)", "14A(3b)(ii)", "14A(3b)(iii)", "14A(3b)(iv)",
  "14A(3b)(v)", "14A(3b)(vi)", "14A(4a)", "14A(4b)", "14A(4b)(i)", "14A(4b)(ii)",
  "14A(4b)(iii)", "14A(4b)(iv)", "14A(4b)(v)", "14A(5)", "14A(6a)", "14A(6b)",
  "14A(6b)(i)", "14A(6b)(ii)", "14A(6b)(iii)", "14A(6b)(iv)", "14A(6c)",
  "14A(6c)(i)", "14A(6c)(ii)", "14A(6c)(iii)", "14A(6c)(iv)", "14A(6c)(v)",
  "14A(6c)(vi)", "14A(7a)", "14A(7b)", "14A(7b)(i)", "14A(7b)(ii)", "14A(7b)(iii)",
  "14A(7b)(iv)", "14A(7b)(ix)", "14A(7b)(v)", "14A(7b)(vi)", "14A(7b)(vii)",
  "14A(7b)(viii)", "14A(7b)(x)", "14A(7b)(xi)", "14A(8)", "14A(8)(i)",
  "14A(8)(ii)", "14A(8)(iii)", "14A(8)(iv)", "14A(8)(v)", "14A(8)(vi)",
  "14A(8)(vii)", "14A(8)(viii)", "14A(9)", "15", "15(a)", "15(b)", "15(c.)",
  "15(i)", "15(ii)", "15(iii)", "15(iv)", "15(ix)", "15(v)", "15(vi)", "15(vii)",
  "15(viii)", "15(x)", "15(xi)", "15(xii)", "15(xiii)", "15(xiv)", "15(xv)",
  "15(xvi)", "150", "150(a)", "150(b)", "151(a)", "151(b)", "152", "153", "154",
  "155", "156", "159", "15A(i)", "15A(ii)", "15A(iii)", "15A(iv)", "16", "160",
  "163", "164", "165", "166", "167", "168", "169", "17", "170", "171", "172",
  "173", "174", "175", "176", "176(i)", "176(ii)", "176(iii)", "176(iv)", "177",
  "178", "179", "18", "18(i)", "18(ii)", "18(iii)", "18(iv)", "18(ix)", "18(v)",
  "18(vi)", "18(vii)", "18(viii)", "18(x)", "18(xi)", "18(xii)", "18(xiii)",
  "18(xiv)", "18(xix)", "18(xv)", "18(xvi)", "18(xvii)", "18(xviii)", "18(xx)",
  "18(xxi)", "180", "181", "19", "2", "2(i)", "2(ii)", "2(ii)(a)", "2(ii)(b)",
  "2(iii)", "20", "21", "22", "23", "24", "25", "26", "26(i)", "26(ii)",
  "26(iii)", "26(iv)", "26(ix)", "26(v)", "26(vi)", "26(vii)", "26(viii)",
  "26(x)", "26(xi)", "26(xii)", "26(xiii)", "26(xiv)", "26(xix)", "26(xv)",
  "26(xvi)", "26(xvii)", "26(xviii)", "27", "27(i)", "27(ii)", "27(iii)",
  "27(iv)", "27(v)", "27(vi)", "27(vii)", "28", "28(i)", "28(ii)", "28(iii)",
  "28(iv)", "28(v)", "28(vi)", "29", "29(i)", "29(ii)", "29(iii)", "29(iv)",
  "29(ix)", "29(v)", "29(vi)", "29(vii)", "29(viii)", "29(x)", "29(xi)",
  "29(xii)", "29(xiii)", "29(xiv)", "29(xv)", "29(xvi)", "29(xvii)", "29(xviii)",
  "29C", "2A", "2A(i)", "2A(ii)", "2A(iii)", "2A(iv)", "2A(ix)", "2A(v)",
  "2A(vi)", "2A(vii)", "2A(viii)", "2B", "2B(i)", "2B(ii)", "2B(iii)", "2C",
  "2C(i)", "2C(ii)", "2D", "2D(i)", "2D(ii)", "2E", "2F", "3", "3(1A)", "3(i)",
  "3(ii)", "30", "30(i)", "30(ii)", "31", "32", "33", "34", "34(1)", "34(2)",
  "34(3)", "34(4)", "35", "36", "37", "38", "39", "4", "4(1)", "4(2)", "40",
  "41", "42", "43", "44", "45", "45(i)", "45(ii)", "45(iii)", "45(iv)", "45v",
  "45vi", "46", "47", "48", "49", "5", "5(i)", "5(ii)", "50", "51", "52", "52A",
  "53", "53(i)", "53(ii)", "53(iii)", "53(iv)", "53(ix)", "53(v)", "53(vi)",
  "53(vii)", "53(viii)", "53(x)", "53(xi)", "53(xii)", "53(xiii)", "53(xiv)",
  "53(xix)", "53(xv)", "53(xvi)", "53(xvii)", "53(xviii)", "54", "55", "56",
  "56(i)", "56(ii)", "57", "58", "59", "6", "6(A)", "6(A)(i)", "6(A)(ii)",
  "6(A)(iii)", "6(A)(iv)", "6(A)(ix)", "6(A)(v)", "6(A)(vi)", "6(A)(vii)",
  "6(A)(viii)", "6(A)(x)", "6(i)", "6(ii)", "60", "61", "62", "63", "64", "65",
  "66", "67", "68", "69", "7", "7(i)", "7(ii)", "70", "70(i)", "70(ii)",
  "70(iii)", "70(iv)", "70(v)", "70(vi)", "71", "72", "73", "73(a)", "73(b)",
  "73A", "74", "75", "76", "77", "78", "79", "8", "8(1)", "8(2)", "8(3)", "8(4)",
  "8(5)", "8(i)", "8(i)(a)", "8(i)(b)", "8(i)(c)", "8(ii)", "80", "81", "82",
  "83", "84", "84(i)", "84(ii)", "84(iii)", "84(iv)", "84(v)", "84(vi)",
  "84(vii)", "85", "86", "87", "88", "89", "8A", "9", "9(i)", "9(ii)", "9(iii)",
  "9(iv)", "9(ix)", "9(v)", "9(vi)", "9(vii)", "9(viii)", "9(x)", "9(xi)",
  "9(xii)", "9(xiii)", "9(xiv)", "9(xix)", "9(xv)", "9(xvi)", "9(xvii)",
  "9(xviii)", "9(xx)", "9(xxi)", "9(xxii)", "9(xxiii)", "90", "91", "92", "93",
  "94", "95", "96", "97", "98", "99", "Region-I", "Region-II"
]
 
const EMPTY_FORM = {
  description: '',
  hsCode: '',
  hsCodeDescription: '',
  uom: 'KG',
  rate: '',
  taxRate: '18%',
  sroSchedule: '',
  itemSNo: ''
}


type FormErrors = Partial<Record<keyof typeof EMPTY_FORM, boolean>>

function validate(form: typeof EMPTY_FORM): FormErrors {
  const errors: FormErrors = {}
  if (!form.description.trim()) errors.description = true
  if (!form.hsCode.trim()) errors.hsCode = true
  if (!form.uom.trim()) errors.uom = true
  if (!form.rate.trim()) errors.rate = true
  if (!form.taxRate.trim()) errors.taxRate = true
  return errors
}

// Small search box for Item S. No. — matches the invoice page's version.
function ItemSNoAutocomplete({
  value,
  onChange
}: {
  value: string
  onChange: (val: string) => void
}) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setQuery(value || '')
  }, [value])

  const matches = query
    ? ITEM_SR_NOS.filter(v => v.toLowerCase().includes(query.toLowerCase())).slice(0, 30)
    : ITEM_SR_NOS.slice(0, 30)

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search Item S. No. (e.g. 1(i)(a))"
        className="w-full bg-surface border border-border text-heading rounded px-3 py-1 text-sm focus:outline-none focus:border-accent"
      />
      {open && matches.length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-surface border border-border rounded shadow-lg">
          {matches.map(m => (
            <div key={m} onClick={() => { onChange(m); setQuery(m); setOpen(false) }}
              className="px-3 py-1 text-sm text-body hover:bg-border-light hover:text-heading cursor-pointer">
              {m}
            </div>
          ))}
        </div>
      )}
    </div>
  )
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

            <div className="bg-surface rounded-xl p-4 border border-border shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Product Details</h2>

              <div className="mb-3">
                <label className="block text-xs text-muted mb-1">
                  HS Code Description *
                  {form.hsCode && <span className="ml-2 text-link font-mono">{form.hsCode}</span>}
                </label>
                <div className={attemptedSubmit && errors.hsCode ? 'rounded ring-1 ring-red-500' : ''}>
                  <HsCodeAutocomplete
                    value={form.hsCodeDescription}
                    onSelect={(code, desc) => handleHsCodeSelect(code, desc)}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-xs text-muted mb-1">Product Description *</label>
                <input
                  ref={descriptionRef}
                  type="text"
                  value={form.description}
                  onChange={e => handleChange('description', e.target.value)}
                  placeholder="e.g. Cotton Yarn 30/1"
                  className={`w-full bg-surface border text-heading rounded px-3 py-1 text-sm focus:outline-none focus:border-accent ${
                    attemptedSubmit && errors.description ? 'border-red-500 ring-1 ring-red-500' : 'border-border'
                  }`}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-muted mb-1">UoM *</label>
                  <div className={attemptedSubmit && errors.uom ? 'rounded ring-2 ring-red-500' : ''}>
                    <StyledSelect
                      options={toOptions(UOMS)}
                      value={form.uom ? { value: form.uom, label: form.uom } : null}
                      onChange={opt => handleChange('uom', opt?.value || '')}
                      placeholder="Select unit of measurement"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Unit Price (PKR) *</label>
                  <input
                    type="number"
                    value={form.rate}
                    onChange={e => handleChange('rate', e.target.value)}
                    placeholder="0.00"
                    className={`w-full bg-surface border text-heading rounded px-3 py-1 text-sm focus:outline-none focus:border-accent ${
                      attemptedSubmit && errors.rate ? 'border-red-500 ring-1 ring-red-500' : 'border-border'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Tax Rate *</label>
                  <div className={attemptedSubmit && errors.taxRate ? 'rounded ring-2 ring-red-500' : ''}>
                    <StyledSelect
                      options={toOptions(RATES)}
                      value={form.taxRate ? { value: form.taxRate, label: form.taxRate } : null}
                      onChange={opt => handleChange('taxRate', opt?.value || '')}
                      placeholder="Select tax rate"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-xs text-muted font-semibold uppercase tracking-wide mb-2">
                  Exemption / Zero &amp; Reduced Rate Reference
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted mb-1">SRO No. / Schedule No.</label>
                    <StyledSelect
                      options={toOptions(SRO_SCHEDULES.filter(Boolean))}
                      value={form.sroSchedule ? { value: form.sroSchedule, label: form.sroSchedule } : null}
                      onChange={opt => handleChange('sroSchedule', opt?.value || '')}
                      placeholder="None"
                      isClearable
                    />
                    <p className="text-xs text-muted mt-1">Required for exempt/zero-rated/reduced-rate items</p>
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1">Item S. No.</label>
                    <ItemSNoAutocomplete
                      value={form.itemSNo}
                      onChange={val => handleChange('itemSNo', val)}
                    />
                    <p className="text-xs text-muted mt-1">Clause number within the selected SRO/Schedule</p>
                  </div>
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