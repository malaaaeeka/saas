'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import StyledSelect from '@/components/ui/StyledSelect'

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '100', label: '100' },
  { value: 'ALL', label: 'All' },
]

const CHUNK_SIZE = 1000 // per-request size when fetching "All"

export default function ClientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [client, setClient] = useState<any>(null)
  const [error, setError] = useState('')
  const [clientLoading, setClientLoading] = useState(true)

  const [profileOpen, setProfileOpen] = useState(false)
  const [invoicesOpen, setInvoicesOpen] = useState(true)

  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize, setPageSize] = useState<number | 'ALL'>(10)

  const [showSearch, setShowSearch] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [invoiceCounts, setInvoiceCounts] = useState<{ totalForType: number, totalForStatus: number, byType: Record<string, number>, byStatus: Record<string, number> }>({ totalForType: 0, totalForStatus: 0, byType: {}, byStatus: {} })

  // Cancels an in-flight "All" fetch loop if filters change mid-fetch
  const fetchIdRef = useRef(0)

  const buildQuery = (p: number, limit: number) => {
    const qparams = new URLSearchParams({
      page: String(p),
      limit: String(limit),
      type: typeFilter,
      status: statusFilter,
    })
    if (search) qparams.set('search', search)
    return qparams.toString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT':    return 'text-success-text bg-success-bg'
      case 'PENDING': return 'text-warning-text bg-warning-bg'
      case 'FAILED':  return 'text-error-text bg-error-bg'
      case 'AMENDED': return 'text-muted bg-border-light'
      default:        return 'text-muted bg-border-light'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'SALE':        return { label: 'Sale',        color: 'text-link' }
      case 'PURCHASE':    return { label: 'Purchase',    color: 'text-muted-dark' }
      case 'CREDIT_NOTE': return { label: 'Credit Note', color: 'text-error-text' }
      case 'DEBIT_NOTE':  return { label: 'Debit Note',  color: 'text-warning-text' }
      default:            return { label: type,          color: 'text-muted' }
    }
  }

  const fetchClient = async (token: string) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ca/client/${clientId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (data.success) {
      setClient(data.data)
    } else {
      setError(data.message || 'Client not found')
    }
  }

  // Normal paginated fetch (10 / 25 / 100)
  const fetchInvoicesPaginated = async (token: string, currentPage: number, limit: number) => {
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ca/client/${clientId}/invoices?${buildQuery(currentPage, limit)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setInvoices(Array.isArray(data.data) ? data.data : [])
        setTotalCount(data.pagination?.total || 0)
      }
    } catch {
      console.log('Failed to fetch invoices')
    } finally {
      setLoading(false)
    }
  }

  // "All" mode: fetch in 1000-row chunks, appending progressively.
  const fetchInvoicesAll = async (token: string) => {
    const myFetchId = ++fetchIdRef.current
    setLoading(true)
    setInvoices([])
    let currentPage = 1
    let total = Infinity
    let loaded = 0
    let accumulated: any[] = []

    try {
      while (loaded < total) {
        if (fetchIdRef.current !== myFetchId) return // filters changed, abort this run
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ca/client/${clientId}/invoices?${buildQuery(currentPage, CHUNK_SIZE)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!data.success) break

        total = data.pagination?.total || 0
        setTotalCount(total)
        accumulated = accumulated.concat(data.data)
        loaded += data.data.length
        currentPage += 1
        if (data.data.length === 0) break // safety exit
      }
      setInvoices(accumulated)
    } catch {
      console.log('Failed to fetch invoices')
    } finally {
      setLoading(false)
    }
  }

  const fetchInvoices = async (token: string, currentPage: number, currentPageSize: number | 'ALL') => {
    if (currentPageSize === 'ALL') {
      await fetchInvoicesAll(token)
    } else {
      await fetchInvoicesPaginated(token, currentPage, currentPageSize)
    }
  }

  const fetchInvoiceCounts = async (token: string) => {
    try {
      const qparams = new URLSearchParams({ type: typeFilter, status: statusFilter })
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ca/client/${clientId}/invoices/counts?${qparams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) setInvoiceCounts(data.data)
    } catch {
      console.log('Failed to fetch invoice counts')
    }
  }

  // Initial client load (once)
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }
    fetchClient(token).finally(() => setClientLoading(false))
  }, [clientId])

  // Invoice fetch: fires once per actual change to page, pageSize,
  // typeFilter, statusFilter, or search. Page-reset on filter change is
  // handled by the filter handlers below (not a separate effect), so
  // changing a filter triggers exactly ONE fetch, not two.
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    fetchInvoices(token, page, pageSize)
    fetchInvoiceCounts(token)
  }, [clientId, page, pageSize, typeFilter, statusFilter, search])

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    const token = localStorage.getItem('token')
    if (token) fetchInvoicesPaginated(token, newPage, pageSize as number)
  }

  const handlePageSizeChange = (newSize: number | 'ALL') => {
    setPageSize(newSize)
    setPage(1)
  }

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value)
    setPage(1)
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setPage(1)
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const isFiltering = typeFilter !== 'ALL' || statusFilter !== 'ALL' || search !== ''

  const tree = useMemo(() => {
    const parents = invoices.filter(inv => !inv.originalInvoiceId)
    const amendments = invoices.filter(inv => !!inv.originalInvoiceId)
    return parents.map(parent => ({
      ...parent,
      amendments: amendments.filter(a => a.originalInvoiceId === parent.id),
    }))
  }, [invoices])

  const flatFilteredRows = useMemo(() => {
    return invoices.map(inv => ({ ...inv, isAmendment: !!inv.originalInvoiceId }))
  }, [invoices])

  const totalPages = pageSize === 'ALL' ? 1 : Math.ceil(totalCount / (pageSize as number))

  const typeOptions = [
    { value: 'ALL', label: 'All Types' },
    { value: 'SALE', label: 'Sale' },
    { value: 'PURCHASE', label: 'Purchase' },
    { value: 'DEBIT_NOTE', label: 'Debit Note' },
    { value: 'CREDIT_NOTE', label: 'Credit Note' },
  ]
  const statusOptions = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'SENT', label: 'Sent' },
    { value: 'FAILED', label: 'Failed' },
    { value: 'AMENDED', label: 'Amended' },
  ]
  const typeCount = (value: string) => value === 'ALL' ? invoiceCounts.totalForType : (invoiceCounts.byType[value] || 0)
  const statusCount = (value: string) => value === 'ALL' ? invoiceCounts.totalForStatus : (invoiceCounts.byStatus[value] || 0)

  const InvoiceRow = ({ invoice, isAmendment = false }: { invoice: any, isAmendment?: boolean }) => {
    const typeInfo = getTypeLabel(invoice.invoiceType)
    return (
      <tr className={`border-t border-border ${isAmendment ? 'bg-surface-alt' : ''}`}>
        <td className="px-4 py-4 break-all">
          <div className="flex items-center gap-2">
            {isAmendment && <span className="text-muted text-lg leading-none">└─</span>}
            <span className="font-mono text-xs text-muted">{invoice.id.slice(0, 12)}...</span>
          </div>
        </td>
        <td className="px-4 py-4 text-sm">{new Date(invoice.invoiceDate || invoice.createdAt).toLocaleDateString()}</td>
        <td className="px-4 py-4 text-sm">
          <span className={`text-xs font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
        </td>
        <td className="px-4 py-4 text-sm break-words">{invoice.buyerName || 'Walk-in Customer'}</td>
        <td className="px-4 py-4 font-semibold text-sm">PKR {Number(invoice.totalAmount).toFixed(2)}</td>
        <td className="px-4 py-4 text-success-text text-sm">PKR {Number(invoice.totalSalesTax || 0).toFixed(2)}</td>
        <td className="px-4 py-4">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(invoice.status)}`}>
            {invoice.status}
          </span>
        </td>
        <td className="px-4 py-4 font-mono text-xs text-link break-all">{invoice.fbrInvoiceNo || '—'}</td>
      </tr>
    )
  }

  if (clientLoading) return <p className="text-muted p-8">Loading client...</p>
  if (error) return <p className="text-error-text p-8">{error}</p>
  if (!client) return null

  return (
    <div className="min-h-screen bg-background text-heading p-8">
      <div className="max-w-7xl mx-auto">

        <Link href="/ca/clients" className="text-sm text-muted hover:text-heading mb-6 inline-block">
          ← Back to My Clients
        </Link>

        <h1 className="text-3xl font-bold mb-2">{client.businessName}</h1>
        <p className="text-muted mb-8">{client.user?.email}</p>

        {/* Profile */}
        <div className="bg-surface rounded-xl border border-border shadow-sm mb-6 overflow-hidden">
          <button
            onClick={() => setProfileOpen(v => !v)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-surface-alt transition"
          >
            <span className="font-semibold text-heading">
              {profileOpen ? 'Hide Business Profile' : 'View Business Profile'}
            </span>
            <span className={`text-muted transition-transform ${profileOpen ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {profileOpen && (
            <div className="border-t border-border p-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted">Business Type</p>
                  <p className="text-heading">{client.businessType}</p>
                </div>
                <div>
                  <p className="text-muted">NTN / CNIC</p>
                  <p className="text-heading font-mono">{client.ntn}</p>
                </div>
                <div>
                  <p className="text-muted">Address</p>
                  <p className="text-heading">{client.address || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted">City</p>
                  <p className="text-heading">{client.city || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted">Phone</p>
                  <p className="text-heading">{client.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted">Whitelisted</p>
                  <p className="text-heading">{client.isWhitelisted ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Invoices */}
        <div className="bg-surface rounded-xl border border-border shadow-sm mb-6 overflow-hidden">
          <button
            onClick={() => setInvoicesOpen(v => !v)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-surface-alt transition"
          >
            <span className="font-semibold text-heading">
              {invoicesOpen ? 'Hide Invoices' : 'View Invoices'}
            </span>
            <span className={`text-muted transition-transform ${invoicesOpen ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {invoicesOpen && (
            <div className="border-t border-border p-6">

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
                  <span className="text-muted text-sm">{totalCount} total</span>
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
                </div>
              </div>

              {showSearch && (
                <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
                  <div className="max-w-4xl mx-auto px-8 py-12">
                    <div className="flex justify-between items-center mb-8">
                      <span className="text-xs text-muted uppercase tracking-widest">Search Invoices</span>
                      <button onClick={() => setShowSearch(false)} className="text-muted hover:text-heading text-2xl leading-none">✕</button>
                    </div>
                    <input
                      autoFocus
                      type="text"
                      value={search}
                      onChange={e => handleSearchChange(e.target.value)}
                      placeholder="Search"
                      className="w-full bg-transparent text-6xl italic font-serif text-heading placeholder-border border-b border-border focus:outline-none pb-4 mb-2"
                    />

                    {search === '' ? (
                      <p className="text-muted text-sm mt-4">Start typing to search invoices...</p>
                    ) : (
                      <div className="mt-8">
                        {invoices.length === 0 ? (
                          <p className="text-muted text-sm">No invoices match "{search}"</p>
                        ) : (
                          invoices.map(inv => {
                            const typeInfo = getTypeLabel(inv.invoiceType)
                            return (
                              <div
                                key={inv.id}
                                onClick={() => setShowSearch(false)}
                                className="py-5 border-b border-border cursor-pointer hover:bg-border-light transition -mx-4 px-4"
                              >
                                <p className="text-xs text-muted uppercase tracking-wide mb-1">
                                  {typeInfo.label} · {inv.status}
                                </p>
                                <p className="text-2xl text-heading mb-1">
                                  {inv.buyerName || 'Walk-in Customer'}
                                </p>
                                <p className="text-sm text-muted">
                                  {inv.fbrInvoiceNo ? `FBR No: ${inv.fbrInvoiceNo}` : inv.id.slice(0, 12)} · PKR {Number(inv.totalAmount).toFixed(2)}
                                </p>
                              </div>
                            )
                          })
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
                      {typeOptions.map(opt => (
                        <button key={opt.value} onClick={() => handleTypeFilterChange(opt.value)} className={`text-left text-sm transition ${typeFilter === opt.value ? 'text-heading font-semibold underline' : 'text-muted hover:text-heading'}`}>
                          {opt.label} ({typeCount(opt.value)})
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted uppercase tracking-wide mb-3">Status</p>
                    <div className="flex flex-col gap-2">
                      {statusOptions.map(opt => (
                        <button key={opt.value} onClick={() => handleStatusFilterChange(opt.value)} className={`text-left text-sm transition ${statusFilter === opt.value ? 'text-heading font-semibold underline' : 'text-muted hover:text-heading'}`}>
                          {opt.label} ({statusCount(opt.value)})
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {loading ? (
                <p className="text-muted">Loading invoices...</p>
              ) : invoices.length === 0 ? (
                <div className="bg-surface rounded-lg p-12 border border-border text-center">
                  <p className="text-muted text-lg mb-2">No invoices match your filters</p>
                  <button onClick={() => { setTypeFilter('ALL'); setStatusFilter('ALL'); setSearch(''); setPage(1) }} className="text-link hover:opacity-70 text-sm transition">
                    Clear filters
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-surface rounded-lg border border-border overflow-x-auto mb-4">
                    <table className="w-full table-fixed">
                      <thead className="bg-border-light">
                        <tr>
                          <th className="text-left px-4 py-4 text-muted text-sm w-[15%]">Invoice ID</th>
                          <th className="text-left px-4 py-4 text-muted text-sm w-[11%]">Date</th>
                          <th className="text-left px-4 py-4 text-muted text-sm w-[10%]">Type</th>
                          <th className="text-left px-4 py-4 text-muted text-sm w-[15%]">Buyer</th>
                          <th className="text-left px-4 py-4 text-muted text-sm w-[12%]">Amount</th>
                          <th className="text-left px-4 py-4 text-muted text-sm w-[11%]">Tax</th>
                          <th className="text-left px-4 py-4 text-muted text-sm w-[10%]">Status</th>
                          <th className="text-left px-4 py-4 text-muted text-sm w-[16%]">FBR No.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isFiltering
                          ? flatFilteredRows.map(row => (
                              <InvoiceRow key={row.id} invoice={row} isAmendment={row.isAmendment} />
                            ))
                          : tree.map(parent => (
                              <React.Fragment key={parent.id}>
                                <InvoiceRow invoice={parent} />
                                {parent.amendments.map((amendment: any) => (
                                  <InvoiceRow key={amendment.id} invoice={amendment} isAmendment={true} />
                                ))}
                              </React.Fragment>
                            ))}
                      </tbody>
                    </table>
                  </div>

                  {pageSize !== 'ALL' && totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <p className="text-muted text-sm">Page {page} of {totalPages} — showing {invoices.length} invoices</p>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handlePageChange(page - 1)} disabled={page === 1} className="w-7 h-7 flex items-center justify-center rounded text-muted hover:text-heading disabled:opacity-30 disabled:cursor-not-allowed transition">←</button>
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
                            <button key={p} onClick={() => handlePageChange(p as number)} className={`w-7 h-7 flex items-center justify-center rounded text-xs transition ${page === p ? 'bg-btn-dark text-btn-dark-text font-semibold' : 'text-muted hover:text-heading hover:bg-border-light'}`}>
                              {p}
                            </button>
                          ))}
                        <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages} className="w-7 h-7 flex items-center justify-center rounded text-muted hover:text-heading disabled:opacity-30 disabled:cursor-not-allowed transition">→</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}