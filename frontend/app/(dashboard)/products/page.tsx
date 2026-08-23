'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import StyledSelect, { toOptions } from '@/components/ui/StyledSelect'
import HsCodeAutocomplete from '@/components/ui/HsCodeAutocomplete'
import ProductAutocomplete from '@/components/ui/ProductAutocomplete'


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
  '100/SqY',
  '17% along with rupees 60 per kilogram',
  '18% along with rupees 60 per kilogram',
  '17% along with rupees 90 per kilogram',
  '200/bill',
  '50/SqY',
  'DTRE',
  'Exempt',
  'Rs.10', 'Rs.10.58', 'Rs.10.65', 'Rs.1000/IMEI', 'Rs.10400/MT', 'Rs.12.89',
  'Rs.13.9', 'Rs.13/KWH', 'Rs.130', 'Rs.14.48', 'Rs.1500/IMEI', 'Rs.1680',
  'Rs.1740', 'Rs.18.47', 'Rs.18.57', 'Rs.2', 'Rs.200', 'Rs.25.16', 'Rs.250',
  'Rs.250/IMEI', 'Rs.29.57', 'Rs.3', 'Rs.3.38', 'Rs.3.60', 'Rs.300/IMEI',
  'Rs.4.72', 'Rs.4.76', 'Rs.4/KWH', 'Rs.425/MT', 'Rs.700/MT', 'Rs.5',
  'Rs.5.58', 'Rs.5400', 'Rs.5600/MT', 'Rs.5862/MT', 'Rs.650/IMEI',
  'Rs.6700/MT', 'Rs.7/KWH', 'Rs.9.36', 'Rs.9.63', 'Rs.9.89', 'Rs.9/KWH',
  'Rs.9270', 'Rs.9500/MT', 'Rs.1000', 'Rs. 16500 per KG', 'Rs. 2000 per Fan'
]

const SRO_SCHEDULES: string[] = [
  ...
  "S.R.O. 1217(I)/2025"
]

const ITEM_SR_NOS: string[] = [
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

function rateToPercent(rate: string): number | null {
  const match = rate.match(/^(\d+(\.\d+)?)%/)
  if (match) return parseFloat(match[1]) / 100
  return null
}

function needsSroReference(taxRate: string): boolean {
  if (taxRate === 'Exempt' || taxRate === 'DTRE') return true
  const pct = rateToPercent(taxRate)
  if (pct !== null && pct < 0.18) return true
  return false
}

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
        className="w-full bg-surface border border-border text-heading rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
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

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '100', label: '100' },
  { value: 'ALL', label: 'All' },
]

interface Product {
  id: string
  description: string
  hsCode: string | null
  hsCodeDescription: string | null
  uom: string | null
  rate: number | null
  taxRate: string | null
  sroSchedule: string | null
  itemSNo: string | null
}

const EMPTY_FORM = {
  description: '', hsCode: '', hsCodeDescription: '',
  uom: 'KG', rate: '', taxRate: '18%', sroSchedule: SRO_SCHEDULES[0], itemSNo: ''
}

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [uomFilter, setUomFilter] = useState('ALL')
  const [taxRateFilter, setTaxRateFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number | 'ALL'>(10)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exporting, setExporting] = useState(false)

  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const fetchProducts = useCallback(async (q: string) => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const url = q.trim()
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/products?q=${encodeURIComponent(q)}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/products`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) {
        setProducts(data.data || [])
      } else {
        setError('Failed to load products')
      }
    } catch {
      setError('Cannot reach server')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }
    fetchProducts('')
  }, [fetchProducts, router])

  const handleSearchChange = (val: string) => {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchProducts(val), 300)
  }

  const handleUomFilterChange = (value: string) => {
    setUomFilter(value)
    setPage(1)
  }

  const handleTaxRateFilterChange = (value: string) => {
    setTaxRateFilter(value)
    setPage(1)
  }

  const handlePageSizeChange = (newSize: number | 'ALL') => {
    setPageSize(newSize)
    setPage(1)
  }

  const uomOptions = Array.from(new Set(products.map(p => p.uom).filter(Boolean))) as string[]
  const taxRateOptions = Array.from(new Set(products.map(p => p.taxRate).filter(Boolean))) as string[]

  const uomCounts = useMemo(() => {
    const filtered = products.filter(p => taxRateFilter === 'ALL' || p.taxRate === taxRateFilter)
    const counts: Record<string, number> = {}
    filtered.forEach(p => { if (p.uom) counts[p.uom] = (counts[p.uom] || 0) + 1 })
    return { counts, total: filtered.length }
  }, [products, taxRateFilter])

  const taxRateCounts = useMemo(() => {
    const filtered = products.filter(p => uomFilter === 'ALL' || p.uom === uomFilter)
    const counts: Record<string, number> = {}
    filtered.forEach(p => { if (p.taxRate) counts[p.taxRate] = (counts[p.taxRate] || 0) + 1 })
    return { counts, total: filtered.length }
  }, [products, uomFilter])

  const filteredProducts = products.filter(p => {
    if (uomFilter !== 'ALL' && p.uom !== uomFilter) return false
    if (taxRateFilter !== 'ALL' && p.taxRate !== taxRateFilter) return false
    return true
  })

  const totalPages = pageSize === 'ALL' ? 1 : Math.ceil(filteredProducts.length / (pageSize as number))
  const pagedProducts = pageSize === 'ALL' ? filteredProducts : filteredProducts.slice((page - 1) * (pageSize as number), page * (pageSize as number))

  const handleFormChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const openAddModal = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setSaveError('')
    setAttemptedSubmit(false)
    setShowModal(true)
  }

  const openEditModal = (p: Product) => {
    setEditingId(p.id)
    setForm({
      description: p.description,
      hsCode: p.hsCode || '',
      hsCodeDescription: p.hsCodeDescription || '',
      uom: p.uom || '',
      rate: p.rate !== null ? String(p.rate) : '',
      taxRate: p.taxRate || '',
      sroSchedule: p.sroSchedule || '',
      itemSNo: p.itemSNo || ''
    })
    setSaveError('')
    setAttemptedSubmit(false)
    setShowModal(true)
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setAttemptedSubmit(true)
    setSaveError('')

    if (!form.description.trim()) {
  setSaveError('Product description is required')
  return
}
if (!form.hsCode.trim()) {
  setSaveError('HS Code is required')
  return
}
if (!form.uom.trim()) {
  setSaveError('UoM is required')
  return
}
if (!(Number(form.rate) > 0)) {
  setSaveError('Rate must be greater than 0')
  return
}
if (!form.taxRate.trim()) {
  setSaveError('Tax Rate is required')
  return
}
if (needsSroReference(form.taxRate) && !form.sroSchedule.trim()) {
  setSaveError('SRO No. / Schedule No. is required for exempt or reduced-rate items')
  return
}
if (needsSroReference(form.taxRate) && !form.itemSNo.trim()) {
  setSaveError('Item S. No. is required for exempt or reduced-rate items')
  return
}

    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const url = editingId
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/products/${editingId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/products`
      const method = editingId ? 'PUT' : 'POST'

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
        setShowModal(false)
        setForm(EMPTY_FORM)
        setEditingId(null)
        setAttemptedSubmit(false)
        fetchProducts('')
      } else {
        setSaveError(data.message || 'Failed to save product')
      }
    } catch {
      setSaveError('Cannot reach server')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteProduct = async (id: string) => {
    setDeletingId(id)
    setDeleteError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setProducts(prev => prev.filter(p => p.id !== id))
        setConfirmDeleteId(null)
      } else {
        setDeleteError(data.message || 'Failed to delete product')
      }
    } catch {
      setDeleteError('Cannot reach server')
    } finally {
      setDeletingId(null)
    }
  }

  const handleExportCSV = () => {
    setShowExportMenu(false)
    const headers = ['Serial No.', 'Description', 'HS Code', 'UoM', 'Rate', 'Tax Rate', 'SRO', 'Item S. No.']
    const escape = (val: string | number | null) => `"${String(val ?? '').replace(/"/g, '""')}"`
    const rows = filteredProducts.map((p, idx) => [
      idx + 1, p.description, p.hsCode, p.uom,
      p.rate !== null ? Number(p.rate).toFixed(2) : '',
      p.taxRate, p.sroSchedule, p.itemSNo
    ].map(escape).join(','))
    const csv = [headers.map(escape).join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'products.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleExportPDF = async () => {
    setShowExportMenu(false)
    setExporting(true)
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({ uom: uomFilter, taxRate: taxRateFilter })

      // Step 1: start the export job
      const startRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/export?${params.toString()}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const startData = await startRes.json()
      if (!startData.success) throw new Error(startData.message || 'Failed to start export')
      const jobId = startData.data.jobId

      // Step 2: poll until the job is done
      let jobStatus = 'PROCESSING'
      while (jobStatus === 'PROCESSING') {
        await new Promise(resolve => setTimeout(resolve, 1500))
        const statusRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/export/${jobId}/status`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const statusData = await statusRes.json()
        if (!statusData.success) throw new Error('Failed to check export status')
        jobStatus = statusData.data.status
        if (jobStatus === 'FAILED') {
          throw new Error(statusData.data.error || 'Export failed')
        }
      }

      // Step 3: download the finished PDF
      const downloadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/export/${jobId}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!downloadRes.ok) throw new Error('Download failed')
      const blob = await downloadRes.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'products.pdf'
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      alert(err.message || 'Failed to export PDF. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-heading p-8">
      <div className="max-w-7xl mx-auto">

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Products</h1>
            <p className="text-muted">Every product your invoices have used</p>
          </div>
         <div className="flex items-center gap-3">
  <button
    onClick={() => router.push('/products/bulk-upload')}
    className="bg-surface border border-border hover:border-heading text-heading px-6 py-3 rounded-lg font-semibold transition"
  >
    Bulk Upload
  </button>
  <button
    onClick={openAddModal}
    className="bg-btn-dark hover:bg-btn-dark-hover text-btn-dark-text px-6 py-3 rounded-lg font-semibold transition"
  >
    Add Product
  </button>
</div>
        </div>

        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
          <div className="flex items-center gap-6">
            <button onClick={() => { setShowSearch(v => !v); setShowFilterPanel(false) }} className="flex items-center gap-2 text-sm text-muted hover:text-heading transition">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Search
            </button>
            <button onClick={() => { setShowFilterPanel(v => !v); setShowSearch(false) }} className="flex items-center gap-2 text-sm text-muted hover:text-heading transition">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="8" y1="12" x2="16" y2="12" />
                <line x1="11" y1="18" x2="13" y2="18" />
              </svg>
              Filter & Sort
            </button>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted text-sm">
              {filteredProducts.length} total products
            </span>
            <div className="w-20">
              <StyledSelect
                options={PAGE_SIZE_OPTIONS}
                value={PAGE_SIZE_OPTIONS.find(o => o.value === String(pageSize))}
                onChange={opt => {
                  const val = opt?.value
                  if (!val) return
                  handlePageSizeChange(val === 'ALL' ? 'ALL' : Number(val))
                }}
                isClearable={false}
                isSearchable={false}
                classNames={{
                  control: () => 'bg-transparent border-none px-1 py-0 text-sm cursor-pointer',
                  placeholder: () => 'text-muted',
                  singleValue: () => 'text-heading',
                  input: () => 'text-heading',
                  menu: () => 'bg-surface border border-border rounded-lg shadow-lg mt-1 z-20 overflow-hidden',
                  menuList: () => 'py-1 max-h-60 overflow-y-auto',
                  option: (state) => `px-3 py-1.5 text-sm cursor-pointer ${state.isSelected ? 'bg-heading text-surface' : state.isFocused ? 'bg-border-light text-heading' : 'text-body'}`,
                  indicatorSeparator: () => 'hidden',
                  dropdownIndicator: () => 'text-muted/70 px-1',
                }}
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(v => !v)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-heading hover:bg-border-light transition"
              >
                ⋮
              </button>
              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 mt-1 w-40 bg-surface border border-border rounded-lg shadow-lg z-20 overflow-hidden">
                    <button
                      onClick={handleExportPDF}
                      disabled={exporting}
                      className="w-full text-left px-4 py-2 text-sm text-body hover:bg-border-light transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {exporting ? 'Generating…' : 'Download PDF'}
                    </button>
                    <button
                      onClick={handleExportCSV}
                      className="w-full text-left px-4 py-2 text-sm text-body hover:bg-border-light transition"
                    >
                      Download CSV
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {showSearch && (
          <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-8 py-12">
              <div className="flex justify-between items-center mb-8">
                <span className="text-xs text-muted uppercase tracking-widest">Search Products</span>
                <button onClick={() => setShowSearch(false)} className="text-muted hover:text-heading text-2xl leading-none">✕</button>
              </div>
              <input
                autoFocus
                type="text"
                value={query}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder="Search"
                className="w-full bg-transparent text-6xl italic font-serif text-heading placeholder-border border-b border-border focus:outline-none pb-4 mb-2"
              />

              {query === '' ? (
                <p className="text-muted text-sm mt-4">Start typing to search products...</p>
              ) : (
                <div className="mt-8">
                  {loading ? (
                    <p className="text-muted text-sm">Searching...</p>
                  ) : products.length === 0 ? (
                    <p className="text-muted text-sm">No products match "{query}"</p>
                  ) : (
                    products.map(p => (
                      <div
                        key={p.id}
                        onClick={() => setShowSearch(false)}
                        className="py-5 border-b border-border cursor-pointer hover:bg-border-light transition -mx-4 px-4"
                      >
                        <p className="text-2xl text-heading mb-1">{p.description}</p>
                        <p className="text-sm text-muted">
                          {p.hsCode || 'No HS code'} · {p.rate !== null ? `PKR ${Number(p.rate).toFixed(2)}` : 'No rate on file'}
                          
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {showFilterPanel && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-xs text-muted uppercase tracking-wide mb-3">UoM</p>
              <div className="flex flex-col gap-2">
                {['ALL', ...uomOptions].map(opt => (
                  <button key={opt} onClick={() => handleUomFilterChange(opt)} className={`text-left text-sm transition ${uomFilter === opt ? 'text-heading font-semibold underline' : 'text-muted hover:text-heading'}`}>
                    {opt === 'ALL' ? 'All UoM' : opt} ({opt === 'ALL' ? uomCounts.total : (uomCounts.counts[opt] || 0)})
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wide mb-3">Tax Rate</p>
              <div className="flex flex-col gap-2">
                {['ALL', ...taxRateOptions].map(opt => (
                  <button key={opt} onClick={() => handleTaxRateFilterChange(opt)} className={`text-left text-sm transition ${taxRateFilter === opt ? 'text-heading font-semibold underline' : 'text-muted hover:text-heading'}`}>
                    {opt === 'ALL' ? 'All Tax Rates' : opt} ({opt === 'ALL' ? taxRateCounts.total : (taxRateCounts.counts[opt] || 0)})
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-xl shadow-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-heading">{editingId ? 'Edit Product' : 'Add Product'}</h2>
                <button onClick={() => setShowModal(false)} className="text-muted hover:text-heading text-xl leading-none">✕</button>
              </div>

              {saveError && (
                <div className="bg-surface border border-border border-l-4 border-l-red-500 rounded-lg px-3 py-2 mb-4">
                  <p className="text-red-700 text-sm">{saveError}</p>
                </div>
              )}

              <form onSubmit={handleSaveProduct} className="space-y-3">
                <div>
                  <label className="block text-sm text-muted mb-1">Product Description *</label>
                  <div className={attemptedSubmit && !form.description.trim() ? 'rounded ring-1 ring-red-500' : ''}>
                    <ProductAutocomplete
                      value={form.description}
                      onSelect={(product) => {
                        if (!product) return
                        setForm(prev => ({
                          ...prev,
                          description: product.description,
                          hsCode: product.hsCode || prev.hsCode,
                          hsCodeDescription: product.hsCodeDescription || prev.hsCodeDescription,
                          uom: product.uom || prev.uom,
                          rate: product.rate !== null && product.rate !== undefined ? String(product.rate) : prev.rate,
                          taxRate: product.taxRate || prev.taxRate,
                          sroSchedule: product.sroSchedule || prev.sroSchedule,
                          itemSNo: product.itemSNo || prev.itemSNo
                        }))
                      }}
                      onTextChange={(text) => handleFormChange('description', text)}
                    />
                  </div>
                </div>
<div>
  <label className="block text-sm text-muted mb-1">
    HS Code Description *
    {form.hsCode && <span className="ml-2 text-link font-mono">{form.hsCode}</span>}
  </label>
  <div className={attemptedSubmit && !form.hsCode.trim() ? 'rounded ring-1 ring-red-500' : ''}>
    <HsCodeAutocomplete
  value={form.hsCodeDescription}
  onSelect={(code, desc, fullEntry) => {
    setForm(prev => ({ ...prev, hsCode: code, hsCodeDescription: `${code}:-${fullEntry}` }))
  }}
/>
  </div>
</div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
  <label className="block text-sm text-muted mb-1">UoM *</label>
  <div className={attemptedSubmit && !form.uom.trim() ? 'rounded ring-2 ring-red-500' : ''}>
    <StyledSelect
      options={toOptions(UOMS)}
      value={{ value: form.uom, label: form.uom }}
      onChange={opt => handleFormChange('uom', opt?.value || '')}
    />
  </div>
</div>
                  <div>
                    <label className="block text-sm text-muted mb-1">Rate (PKR) *</label>
                    <input type="number" value={form.rate} onChange={e => handleFormChange('rate', e.target.value)}
                      className={`w-full bg-surface border text-heading rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent ${
                        attemptedSubmit && !(Number(form.rate) > 0) ? 'border-red-500 ring-1 ring-red-500' : 'border-border'
                      }`} />
                  </div>
                </div>
<div>
  <label className="block text-sm text-muted mb-1">Tax Rate *</label>
  <div className={attemptedSubmit && !form.taxRate.trim() ? 'rounded ring-2 ring-red-500' : ''}>
    <StyledSelect
      options={toOptions(RATES)}
      value={{ value: form.taxRate, label: form.taxRate }}
      onChange={opt => handleFormChange('taxRate', opt?.value || '')}
    />
  </div>
</div>

                <div className="grid grid-cols-2 gap-3">
  <div>
    <label className="block text-sm text-muted mb-1">
      SRO No. / Schedule No.{needsSroReference(form.taxRate) && <span className="ml-1 text-red-500">*</span>}
    </label>
    <div className={attemptedSubmit && needsSroReference(form.taxRate) && !form.sroSchedule.trim() ? 'rounded ring-2 ring-red-500' : ''}>
      <StyledSelect
        options={toOptions(SRO_SCHEDULES)}
        value={{ value: form.sroSchedule, label: form.sroSchedule }}
        onChange={opt => handleFormChange('sroSchedule', opt?.value || '')}
      />
    </div>
  </div>
  <div>
    <label className="block text-sm text-muted mb-1">
      Item S. No.{needsSroReference(form.taxRate) && <span className="ml-1 text-red-500">*</span>}
    </label>
    <div className={attemptedSubmit && needsSroReference(form.taxRate) && !form.itemSNo.trim() ? 'rounded ring-2 ring-red-500' : ''}>
      <ItemSNoAutocomplete value={form.itemSNo} onChange={val => handleFormChange('itemSNo', val)} />
    </div>
  </div>
</div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving}
                    className="bg-btn-dark hover:bg-btn-dark-hover disabled:opacity-50 text-btn-dark-text font-semibold py-2 px-6 rounded-lg text-sm transition">
                    {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Save Product'}
                  </button>
                  <button type="button" onClick={() => setShowModal(false)}
                    className="bg-surface border border-border hover:border-heading text-heading font-semibold py-2 px-6 rounded-lg text-sm transition">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-surface border border-border border-l-4 border-l-red-500 rounded-xl px-4 py-3 mb-6 shadow-sm">
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {deleteError && (
          <div className="bg-surface border border-border border-l-4 border-l-red-500 rounded-xl px-4 py-3 mb-6 shadow-sm">
            <p className="text-red-700 text-sm font-medium">{deleteError}</p>
          </div>
        )}

        {loading ? (
          <p className="text-muted">Loading products...</p>
        ) : products.length === 0 ? (
          <div className="bg-surface rounded-lg p-12 border border-border text-center">
            <p className="text-muted text-lg">No products found</p>
          </div>
        ) : (
          <div className="bg-surface rounded-lg border border-border overflow-x-auto mb-4">
            <table className="w-full table-fixed">
              <thead className="bg-border-light">
                <tr>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[6%]">Serial No.</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[18%]">Description</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[9%]">HS Code</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[9%]">UoM</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[9%]">Rate</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[9%]">Tax Rate</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[14%]">SRO</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[12%]">Item S. No.</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[11%]">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedProducts.map((p, idx) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/products/${p.id}`)}
                    className="border-t border-border hover:bg-border-light transition cursor-pointer"
                  >
                    <td className="px-4 py-4 font-mono text-xs text-muted">
                      {pageSize === 'ALL' ? idx + 1 : (page - 1) * (pageSize as number) + idx + 1}
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-muted break-words">{p.description}</td>
                    <td className="px-4 py-4 text-sm font-mono">{p.hsCode || <span className="text-muted text-xs font-mono">—</span>}</td>
                    <td className="px-4 py-4">
  {p.uom ? (
    <span className="px-3 py-1 rounded-full text-xs font-semibold text-success-text bg-success-bg">
      {p.uom}
    </span>
  ) : (
    <span className="text-muted text-xs font-mono">—</span>
  )}
</td>
                    <td className="px-4 py-4 text-sm font-semibold whitespace-nowrap">{p.rate !== null ? `PKR ${Number(p.rate).toFixed(2)}` : <span className="text-muted text-xs font-mono">—</span>}</td>
                    <td className="px-4 py-4 text-xs font-medium text-link">{p.taxRate || <span className="text-muted text-xs font-mono">—</span>}</td>
                    <td className="px-4 py-4 text-sm break-words">{p.sroSchedule || <span className="text-muted text-xs font-mono">—</span>}</td>
                    <td className="px-4 py-4 text-sm">{p.itemSNo || <span className="text-muted text-xs font-mono">—</span>}</td>
                    <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                          <button onClick={() => openEditModal(p)} className="text-link hover:opacity-70 text-xs font-semibold transition underline">
                            Edit
                          </button>
                          {confirmDeleteId !== p.id && (
                            <button onClick={() => setConfirmDeleteId(p.id)} className="text-muted hover:text-error-text text-xs font-semibold transition underline">
                              Delete
                            </button>
                          )} 
                        </div>
                        {confirmDeleteId === p.id && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted">Sure?</span>
                            <button onClick={() => handleDeleteProduct(p.id)} disabled={deletingId === p.id} className="text-error-text hover:opacity-70 text-xs font-semibold transition underline disabled:opacity-40 disabled:cursor-not-allowed">
                              {deletingId === p.id ? '...' : 'Yes'}
                            </button>
                            <button onClick={() => setConfirmDeleteId(null)} className="text-muted hover:text-heading text-xs font-semibold transition underline">
                              No
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pageSize !== 'ALL' && totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-muted text-sm">Page {page} of {totalPages} — showing {pagedProducts.length} products</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-7 h-7 flex items-center justify-center rounded text-muted hover:text-heading disabled:opacity-30 disabled:cursor-not-allowed transition">←</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce((acc: (number | string)[], p, idx, arr) => {
                  if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, idx) => p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="w-7 h-7 flex items-center justify-center text-muted text-xs">...</span>
                ) : (
                  <button key={p} onClick={() => setPage(p as number)} className={`w-7 h-7 flex items-center justify-center rounded text-xs transition ${page === p ? 'bg-btn-dark text-btn-dark-text font-semibold' : 'text-muted hover:text-heading hover:bg-border-light'}`}>
                    {p}
                  </button>
                ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-7 h-7 flex items-center justify-center rounded text-muted hover:text-heading disabled:opacity-30 disabled:cursor-not-allowed transition">→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}