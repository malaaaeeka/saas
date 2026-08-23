'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import StyledSelect from '@/components/ui/StyledSelect'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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
  uom: '', rate: '', taxRate: '', sroSchedule: '', itemSNo: ''
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

  const handleExportPDF = () => {
    setShowExportMenu(false)
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text('Products', 14, 15)

    autoTable(doc, {
      startY: 20,
      head: [['Serial No.', 'Description', 'HS Code', 'UoM', 'Rate', 'Tax Rate', 'SRO', 'Item S. No.']],
      body: filteredProducts.map((p, idx) => [
        idx + 1,
        p.description || '',
        p.hsCode || '',
        p.uom || '',
        p.rate !== null ? `PKR ${Number(p.rate).toFixed(2)}` : '',
        p.taxRate || '',
        p.sroSchedule || '',
        p.itemSNo || ''
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [230, 230, 230], textColor: 20 }
    })

    doc.save('products.pdf')
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
                      className="w-full text-left px-4 py-2 text-sm text-body hover:bg-border-light transition"
                    >
                      Download PDF
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
                  <input type="text" value={form.description} onChange={e => handleFormChange('description', e.target.value)}
                    className={`w-full bg-surface border text-heading rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent ${
                      attemptedSubmit && !form.description.trim() ? 'border-red-500 ring-1 ring-red-500' : 'border-border'
                    }`} />
                </div>

                <div>
                  <label className="block text-sm text-muted mb-1">HS Code</label>
                  <input type="text" value={form.hsCode} onChange={e => handleFormChange('hsCode', e.target.value)}
                    placeholder="e.g. 0601"
                    className="w-full bg-surface border border-border text-heading rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                </div>

                <div>
                  <label className="block text-sm text-muted mb-1">HS Code Description</label>
                  <input type="text" value={form.hsCodeDescription} onChange={e => handleFormChange('hsCodeDescription', e.target.value)}
                    className="w-full bg-surface border border-border text-heading rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-muted mb-1">UoM</label>
                    <input type="text" value={form.uom} onChange={e => handleFormChange('uom', e.target.value)}
                      placeholder="e.g. KG"
                      className="w-full bg-surface border border-border text-heading rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="block text-sm text-muted mb-1">Rate (PKR)</label>
                    <input type="number" value={form.rate} onChange={e => handleFormChange('rate', e.target.value)}
                      className="w-full bg-surface border border-border text-heading rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-muted mb-1">Tax Rate</label>
                  <input type="text" value={form.taxRate} onChange={e => handleFormChange('taxRate', e.target.value)}
                    placeholder="e.g. 18%"
                    className="w-full bg-surface border border-border text-heading rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-muted mb-1">SRO No. / Schedule No.</label>
                    <input type="text" value={form.sroSchedule} onChange={e => handleFormChange('sroSchedule', e.target.value)}
                      className="w-full bg-surface border border-border text-heading rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="block text-sm text-muted mb-1">Item S. No.</label>
                    <input type="text" value={form.itemSNo} onChange={e => handleFormChange('itemSNo', e.target.value)}
                      className="w-full bg-surface border border-border text-heading rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent" />
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