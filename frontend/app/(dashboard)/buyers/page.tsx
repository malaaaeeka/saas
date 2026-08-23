'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import StyledSelect, { toOptions } from '@/components/ui/StyledSelect'
import ClientAutocomplete from '@/components/ui/ClientAutocomplete'

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '100', label: '100' },
  { value: 'ALL', label: 'All' },
]

interface Buyer {
  id: string
  buyerName: string
  buyerNtn: string | null
  buyerCnic: string | null
  buyerType: string | null
  province: string | null
  address: string | null
  phone: string | null
  email: string | null
}

const BUYER_TYPES = ['Registered', 'Unregistered', 'Unregistered Distributor', 'Retail Consumer']

const PROVINCES = [
  'AZAD JAMMU AND KASHMIR',
  'BALOCHISTAN',
  'CAPITAL TERRITORY',
  'GILGIT BALTISTAN',
  'KHYBER PAKHTUNKHWA',
  'PUNJAB',
  'SINDH',
  'FATA/PATA'
]

const NTN_REGEX = /^\d{7}$/
const CNIC_REGEX = /^\d{5}-?\d{7}-?\d{1}$/

function onlyDigits(v: string): string {
  return v.replace(/\D/g, '')
}

function normalizeCnic(v: string): string {
  const digits = onlyDigits(v)
  if (digits.length !== 13) return v
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`
}

function classifyBuyerId(v: string): 'ntn' | 'cnic' | 'invalid' | 'incomplete' {
  const digits = onlyDigits(v)
  if (digits.length === 0) return 'incomplete'
  if (NTN_REGEX.test(digits)) return 'ntn'
  if (CNIC_REGEX.test(v) || digits.length === 13) return 'cnic'
  if (digits.length < 7) return 'incomplete'
  if (digits.length > 7 && digits.length < 13) return 'incomplete'
  return 'invalid'
}

const EMPTY_FORM = {
  buyerName: '', buyerNtnCnic: '', buyerType: '',
  province: '', address: '', phone: '', email: ''
}

export default function BuyersPage() {
  const router = useRouter()
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [provinceFilter, setProvinceFilter] = useState('ALL')
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

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value)
    setPage(1)
  }

  const handleProvinceFilterChange = (value: string) => {
    setProvinceFilter(value)
    setPage(1)
  }

  const handlePageSizeChange = (newSize: number | 'ALL') => {
    setPageSize(newSize)
    setPage(1)
  }

  const typeCounts = useMemo(() => {
    const filtered = buyers.filter(b => provinceFilter === 'ALL' || b.province === provinceFilter)
    const counts: Record<string, number> = {}
    filtered.forEach(b => {
      const t = b.buyerType || 'Unregistered'
      counts[t] = (counts[t] || 0) + 1
    })
    return { counts, total: filtered.length }
  }, [buyers, provinceFilter])

  const provinceCounts = useMemo(() => {
    const filtered = buyers.filter(b => typeFilter === 'ALL' || (b.buyerType || 'Unregistered') === typeFilter)
    const counts: Record<string, number> = {}
    filtered.forEach(b => { if (b.province) counts[b.province] = (counts[b.province] || 0) + 1 })
    return { counts, total: filtered.length }
  }, [buyers, typeFilter])

  const filteredBuyers = buyers.filter(b => {
    if (typeFilter !== 'ALL' && (b.buyerType || 'Unregistered') !== typeFilter) return false
    if (provinceFilter !== 'ALL' && b.province !== provinceFilter) return false
    return true
  })

  const totalPages = pageSize === 'ALL' ? 1 : Math.ceil(filteredBuyers.length / (pageSize as number))
  const pagedBuyers = pageSize === 'ALL' ? filteredBuyers : filteredBuyers.slice((page - 1) * (pageSize as number), page * (pageSize as number))

  const handleFormChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleNtnCnicBlur = () => {
    if (classifyBuyerId(form.buyerNtnCnic) === 'cnic') {
      setForm(prev => ({ ...prev, buyerNtnCnic: normalizeCnic(prev.buyerNtnCnic) }))
    }
  }

  const idKind = classifyBuyerId(form.buyerNtnCnic)

  const openAddModal = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setSaveError('')
    setAttemptedSubmit(false)
    setShowModal(true)
  }

  const openEditModal = (b: Buyer) => {
    setEditingId(b.id)
    setForm({
      buyerName: b.buyerName,
      buyerNtnCnic: b.buyerNtn || b.buyerCnic || '',
      buyerType: b.buyerType || '',
      province: b.province || '',
      address: b.address || '',
      phone: b.phone || '',
      email: b.email || ''
    })
    setSaveError('')
    setAttemptedSubmit(false)
    setShowModal(true)
  }

  const handleSaveBuyer = async (e: React.FormEvent) => {
    e.preventDefault()
    setAttemptedSubmit(true)
    setSaveError('')

    if (!form.buyerName.trim()) {
      setSaveError('Buyer name is required')
      return
    }
    if (idKind !== 'ntn' && idKind !== 'cnic') {
      setSaveError('Enter a valid 7-digit NTN or a 13-digit CNIC (format: 12345-1234567-1)')
      return
    }
    if (!form.buyerType) {
      setSaveError('Buyer type is required')
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const url = editingId
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/buyers/${editingId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/buyers`
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          buyerName: form.buyerName,
          buyerNtn: idKind === 'ntn' ? onlyDigits(form.buyerNtnCnic) : '',
          buyerCnic: idKind === 'cnic' ? form.buyerNtnCnic : '',
          buyerType: form.buyerType,
          province: form.province,
          address: form.address,
          phone: form.phone,
          email: form.email
        })
      })
      const data = await res.json()
      if (data.success) {
        setShowModal(false)
        setForm(EMPTY_FORM)
        setEditingId(null)
        setAttemptedSubmit(false)
        fetchBuyers('')
      } else {
        setSaveError(data.message || 'Failed to save buyer')
      }
    } catch {
      setSaveError('Cannot reach server')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteBuyer = async (id: string) => {
    setDeletingId(id)
    setDeleteError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/buyers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setBuyers(prev => prev.filter(b => b.id !== id))
        setConfirmDeleteId(null)
      } else {
        setDeleteError(data.message || 'Failed to delete buyer')
      }
    } catch {
      setDeleteError('Cannot reach server')
    } finally {
      setDeletingId(null)
    }
  }

  const handleExportCSV = () => {
    setShowExportMenu(false)
    const headers = ['Serial No.', 'Name', 'NTN', 'CNIC', 'Type', 'Province', 'Phone', 'Email', 'Address']
    const escape = (val: string | number | null) => `"${String(val ?? '').replace(/"/g, '""')}"`
    const rows = filteredBuyers.map((b, idx) => [
      idx + 1, b.buyerName, b.buyerNtn, b.buyerCnic,
      b.buyerType || 'Unregistered', b.province, b.phone, b.email, b.address
    ].map(escape).join(','))
    const csv = [headers.map(escape).join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'buyers.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleExportPDF = async () => {
    setShowExportMenu(false)
    setExporting(true)
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({ type: typeFilter, province: provinceFilter })

      // Step 1: start the export job
      const startRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/buyers/export?${params.toString()}`, {
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
        const statusRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/buyers/export/${jobId}/status`, {
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
      const downloadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/buyers/export/${jobId}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!downloadRes.ok) throw new Error('Download failed')
      const blob = await downloadRes.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'buyers.pdf'
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
            <h1 className="text-3xl font-bold mb-2">Buyers</h1>
            <p className="text-muted">All buyers saved to your business</p>
          </div>
         <div className="flex items-center gap-3">
  <button
    onClick={() => router.push('/buyers/bulk-upload')}
    className="bg-surface border border-border hover:border-heading text-heading px-6 py-3 rounded-lg font-semibold transition"
  >
    Bulk Upload
  </button>
  <button
    onClick={openAddModal}
    className="bg-btn-dark hover:bg-btn-dark-hover text-btn-dark-text px-6 py-3 rounded-lg font-semibold transition"
  >
    Add Buyer
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
              {filteredBuyers.length} total buyers
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

        {showFilterPanel && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-xs text-muted uppercase tracking-wide mb-3">Type</p>
              <div className="flex flex-col gap-2">
                {['ALL', ...BUYER_TYPES].map(opt => (
                  <button key={opt} onClick={() => handleTypeFilterChange(opt)} className={`text-left text-sm transition ${typeFilter === opt ? 'text-heading font-semibold underline' : 'text-muted hover:text-heading'}`}>
                    {opt === 'ALL' ? 'All Types' : opt} ({opt === 'ALL' ? typeCounts.total : (typeCounts.counts[opt] || 0)})
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wide mb-3">Province</p>
              <div className="flex flex-col gap-2">
                {['ALL', ...PROVINCES].map(opt => (
                  <button key={opt} onClick={() => handleProvinceFilterChange(opt)} className={`text-left text-sm transition ${provinceFilter === opt ? 'text-heading font-semibold underline' : 'text-muted hover:text-heading'}`}>
                    {opt === 'ALL' ? 'All Provinces' : opt} ({opt === 'ALL' ? provinceCounts.total : (provinceCounts.counts[opt] || 0)})
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-xl shadow-lg w-full max-w-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-heading">{editingId ? 'Edit Buyer' : 'Add Buyer'}</h2>
                <button onClick={() => setShowModal(false)} className="text-muted hover:text-heading text-xl leading-none">✕</button>
              </div>

              {saveError && (
                <div className="bg-surface border border-border border-l-4 border-l-red-500 rounded-lg px-3 py-2 mb-4">
                  <p className="text-red-700 text-sm">{saveError}</p>
                </div>
              )}

              <form onSubmit={handleSaveBuyer} className="space-y-3">
               <div>
  <label className="block text-sm text-muted mb-1">Buyer Name *</label>
  <div className={attemptedSubmit && !form.buyerName.trim() ? 'rounded-lg ring-1 ring-red-500' : ''}>
    <ClientAutocomplete
      value={form.buyerName}
      onSelect={(buyer) => {
        if (!buyer) return
        setForm(prev => ({
          ...prev,
          buyerName: buyer.buyerName,
          buyerNtnCnic: buyer.buyerNtn || buyer.buyerCnic || prev.buyerNtnCnic,
          buyerType: buyer.buyerType || prev.buyerType
        }))
      }}
      onTextChange={(text) => handleFormChange('buyerName', text)}
    />
  </div>
</div>

                <div>
                  <label className="block text-sm text-muted mb-1">Buyer NTN / CNIC *</label>
                  <input type="text" value={form.buyerNtnCnic}
                    onChange={e => handleFormChange('buyerNtnCnic', e.target.value)}
                    onBlur={handleNtnCnicBlur}
                    placeholder="7-digit NTN or 12345-1234567-1"
                    className={`w-full bg-surface border text-heading rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent ${
                      attemptedSubmit && idKind !== 'ntn' && idKind !== 'cnic' ? 'border-red-500 ring-1 ring-red-500' : 'border-border'
                    }`} />
                  {attemptedSubmit && idKind === 'invalid' && (
                    <p className="text-xs mt-1 text-red-500">Not a valid NTN (7 digits) or CNIC (13 digits) format</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-muted mb-1">Buyer Type *</label>
                  <div className={attemptedSubmit && !form.buyerType ? 'rounded-lg ring-2 ring-red-500' : ''}>
                    <StyledSelect
                      options={toOptions(BUYER_TYPES)}
                      value={form.buyerType ? { value: form.buyerType, label: form.buyerType } : null}
                      onChange={opt => handleFormChange('buyerType', opt?.value || '')}
                      placeholder="Select buyer type"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-muted mb-1">Province</label>
                  <StyledSelect
                    options={toOptions(PROVINCES)}
                    value={form.province ? { value: form.province, label: form.province } : null}
                    onChange={opt => handleFormChange('province', opt?.value || '')}
                    placeholder="Select province"
                  />
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
                    {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Save Buyer'}
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
                  <th className="text-left px-4 py-4 text-muted text-sm w-[6%]">Serial No.</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[13%]">Name</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[9%]">NTN</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[12%]">CNIC</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[10%]">Type</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[10%]">Province</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[9%]">Phone</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[11%]">Email</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[10%]">Address</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[11%]">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedBuyers.map((b, idx) => (
                  <tr
                    key={b.id}
                    onClick={() => router.push(`/buyers/${b.id}`)}
                    className="border-t border-border hover:bg-border-light transition cursor-pointer"
                  >
                    <td className="px-4 py-4 font-mono text-xs text-muted">
                      {pageSize === 'ALL' ? idx + 1 : (page - 1) * (pageSize as number) + idx + 1}
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-muted break-words">{b.buyerName}</td>
                    <td className="px-4 py-4 text-sm font-mono">{b.buyerNtn || <span className="text-muted text-xs font-mono">—</span>}</td>
                    <td className="px-4 py-4 text-sm font-mono">{b.buyerCnic || <span className="text-muted text-xs font-mono">—</span>}</td>
                    <td className="px-4 py-4 text-sm font-bold text-heading">{b.buyerType || <span className="text-muted text-xs font-mono">—</span>}</td>
                    <td className="px-4 py-4 text-xs font-medium text-success-text">{b.province || <span className="text-muted text-xs font-mono">—</span>}</td>
                    <td className="px-4 py-4 text-sm">{b.phone || <span className="text-muted text-xs font-mono">—</span>}</td>
                    <td className="px-4 py-4 text-sm break-words">{b.email || <span className="text-muted text-xs font-mono">—</span>}</td>
                    <td className="px-4 py-4 text-sm break-words">{b.address || <span className="text-muted text-xs font-mono">—</span>}</td>
                    <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                          <button onClick={() => openEditModal(b)} className="text-link hover:opacity-70 text-xs font-semibold transition underline">
                            Edit
                          </button>
                          {confirmDeleteId !== b.id && (
                            <button onClick={() => setConfirmDeleteId(b.id)} className="text-muted hover:text-error-text text-xs font-semibold transition underline">
                              Delete
                            </button>
                          )}
                        </div>
                        {confirmDeleteId === b.id && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted">Sure?</span>
                            <button onClick={() => handleDeleteBuyer(b.id)} disabled={deletingId === b.id} className="text-error-text hover:opacity-70 text-xs font-semibold transition underline disabled:opacity-40 disabled:cursor-not-allowed">
                              {deletingId === b.id ? '...' : 'Yes'}
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
            <p className="text-muted text-sm">Page {page} of {totalPages} — showing {pagedBuyers.length} buyers</p>
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