'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Buyer {
  id: string
  buyerName: string
  buyerNtn: string | null
  buyerCnic: string | null
  buyerType: string | null
  address: string | null
  phone: string | null
  email: string | null
}

const BUYER_TYPES = ['Registered', 'Unregistered', 'Unregistered Distributor', 'Retail Consumer']

const EMPTY_FORM = {
  buyerName: '', buyerNtn: '', buyerCnic: '', buyerType: 'Unregistered',
  address: '', phone: '', email: ''
}

export default function BuyersPage() {
  const router = useRouter()
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const fetchBuyers = useCallback(async (q: string) => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const url = q.trim()
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/buyers?q=${encodeURIComponent(q)}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/buyers`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) {
        setBuyers(data.data || [])
      } else {
        setError('Failed to load buyers')
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
    fetchBuyers('')
  }, [fetchBuyers, router])

  const handleSearchChange = (val: string) => {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchBuyers(val), 300)
  }

  const handleFormChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleAddBuyer = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveError('')

    if (!form.buyerName.trim()) {
      setSaveError('Buyer name is required')
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/buyers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (data.success) {
        setShowAddModal(false)
        setForm(EMPTY_FORM)
        fetchBuyers('')
      } else {
        setSaveError(data.message || 'Failed to add buyer')
      }
    } catch {
      setSaveError('Cannot reach server')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-heading p-8">
      <div className="max-w-7xl mx-auto">

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Buyers</h1>
            <p className="text-muted">All buyers saved to your business</p>
          </div>
          <button
            onClick={() => { setForm(EMPTY_FORM); setSaveError(''); setShowAddModal(true) }}
            className="bg-btn-dark hover:bg-btn-dark-hover text-btn-dark-text px-6 py-3 rounded-lg font-semibold transition"
          >
            Add Buyer
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
              {buyers.length} total buyers
            </span>
          </div>
        </div>

        {showSearch && (
          <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-8 py-12">
              <div className="flex justify-between items-center mb-8">
                <span className="text-xs text-muted uppercase tracking-widest">Search Buyers</span>
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
                <p className="text-muted text-sm mt-4">Start typing to search buyers...</p>
              ) : (
                <div className="mt-8">
                  {loading ? (
                    <p className="text-muted text-sm">Searching...</p>
                  ) : buyers.length === 0 ? (
                    <p className="text-muted text-sm">No buyers match "{query}"</p>
                  ) : (
                    buyers.map(b => (
                      <div
                        key={b.id}
                        onClick={() => setShowSearch(false)}
                        className="py-5 border-b border-border cursor-pointer hover:bg-border-light transition -mx-4 px-4"
                      >
                        <p className="text-2xl text-heading mb-1">{b.buyerName}</p>
                        <p className="text-sm text-muted">
                          {b.buyerNtn || b.buyerCnic || 'No NTN/CNIC on file'} · {b.buyerType || 'Unregistered'}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {showAddModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-xl shadow-lg w-full max-w-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-heading">Add Buyer</h2>
                <button onClick={() => setShowAddModal(false)} className="text-muted hover:text-heading text-xl leading-none">✕</button>
              </div>

              {saveError && (
                <div className="bg-surface border border-border border-l-4 border-l-red-500 rounded-lg px-3 py-2 mb-4">
                  <p className="text-red-700 text-sm">{saveError}</p>
                </div>
              )}

              <form onSubmit={handleAddBuyer} className="space-y-3">
                <div>
                  <label className="block text-sm text-muted mb-1">Buyer Name *</label>
                  <input type="text" value={form.buyerName} onChange={e => handleFormChange('buyerName', e.target.value)}
                    className="w-full bg-surface border border-border text-heading rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-muted mb-1">NTN</label>
                    <input type="text" value={form.buyerNtn} onChange={e => handleFormChange('buyerNtn', e.target.value)}
                      placeholder="7-digit NTN"
                      className="w-full bg-surface border border-border text-heading rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="block text-sm text-muted mb-1">CNIC</label>
                    <input type="text" value={form.buyerCnic} onChange={e => handleFormChange('buyerCnic', e.target.value)}
                      placeholder="12345-1234567-1"
                      className="w-full bg-surface border border-border text-heading rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-muted mb-1">Buyer Type</label>
                  <select value={form.buyerType} onChange={e => handleFormChange('buyerType', e.target.value)}
                    className="w-full bg-surface border border-border text-heading rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent">
                    {BUYER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-muted mb-1">Phone</label>
                    <input type="text" value={form.phone} onChange={e => handleFormChange('phone', e.target.value)}
                      className="w-full bg-surface border border-border text-heading rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="block text-sm text-muted mb-1">Email</label>
                    <input type="email" value={form.email} onChange={e => handleFormChange('email', e.target.value)}
                      className="w-full bg-surface border border-border text-heading rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-muted mb-1">Address</label>
                  <input type="text" value={form.address} onChange={e => handleFormChange('address', e.target.value)}
                    className="w-full bg-surface border border-border text-heading rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving}
                    className="bg-btn-dark hover:bg-btn-dark-hover disabled:opacity-50 text-btn-dark-text font-semibold py-2 px-6 rounded-lg text-sm transition">
                    {saving ? 'Saving...' : 'Save Buyer'}
                  </button>
                  <button type="button" onClick={() => setShowAddModal(false)}
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

        {loading ? (
          <p className="text-muted">Loading buyers...</p>
        ) : buyers.length === 0 ? (
          <div className="bg-surface rounded-lg p-12 border border-border text-center">
            <p className="text-muted text-lg">No buyers found</p>
          </div>
        ) : (
          <div className="bg-surface rounded-lg border border-border overflow-x-auto mb-4">
            <table className="w-full table-fixed">
              <thead className="bg-border-light">
                <tr>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[18%]">Name</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[12%]">NTN</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[16%]">CNIC</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[12%]">Type</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[12%]">Phone</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[15%]">Email</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[15%]">Address</th>
                </tr>
              </thead>
              <tbody>
                {buyers.map(b => (
                  <tr key={b.id} className="border-t border-border hover:bg-border-light transition">
                    <td className="px-4 py-4 text-sm font-medium text-heading break-words">{b.buyerName}</td>
                    <td className="px-4 py-4 text-sm">{b.buyerNtn || '—'}</td>
                    <td className="px-4 py-4 text-sm">{b.buyerCnic || '—'}</td>
                    <td className="px-4 py-4 text-sm">{b.buyerType || '—'}</td>
                    <td className="px-4 py-4 text-sm">{b.phone || '—'}</td>
                    <td className="px-4 py-4 text-sm break-words">{b.email || '—'}</td>
                    <td className="px-4 py-4 text-sm break-words">{b.address || '—'}</td>
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