'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

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

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')

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

  return (
    <div className="min-h-screen bg-background text-heading p-8">
      <div className="max-w-7xl mx-auto">

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Products</h1>
            <p className="text-muted">Every product your invoices have used</p>
          </div>
          <button
            onClick={openAddModal}
            className="bg-btn-dark hover:bg-btn-dark-hover text-btn-dark-text px-6 py-3 rounded-lg font-semibold transition"
          >
            Add Product
          </button>
        </div>

        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
          <div className="flex items-center gap-6">
            <button onClick={() => setShowSearch(v => !v)} className="flex items-center gap-2 text-sm text-muted hover:text-heading transition">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Search
            </button>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted text-sm">
              {products.length} total products
            </span>
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
                          {p.hsCode || 'No HS code'} · {p.rate !== null ? `PKR ${p.rate}` : 'No rate on file'}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
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
                  <th className="text-left px-4 py-4 text-muted text-sm w-[20%]">Description</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[10%]">HS Code</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[10%]">UoM</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[10%]">Rate</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[10%]">Tax Rate</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[15%]">SRO</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[13%]">Item S. No.</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[12%]">Action</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/products/${p.id}`)}
                    className="border-t border-border hover:bg-border-light transition cursor-pointer"
                  >
                    <td className="px-4 py-4 text-sm font-semibold text-heading break-words">{p.description}</td>
                    <td className="px-4 py-4 text-sm font-mono">{p.hsCode || <span className="text-muted text-xs font-mono">—</span>}</td>
                    <td className="px-4 py-4 text-sm">{p.uom || <span className="text-muted text-xs font-mono">—</span>}</td>
                    <td className="px-4 py-4 text-sm font-semibold">{p.rate !== null ? `PKR ${p.rate}` : <span className="text-muted text-xs font-mono">—</span>}</td>
                    <td className="px-4 py-4 text-sm">{p.taxRate || <span className="text-muted text-xs font-mono">—</span>}</td>
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
      </div>
    </div>
  )
}