'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import StyledSelect, { toOptions } from '@/components/ui/StyledSelect'

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '100', label: '100' },
  { value: 'ALL', label: 'All' },
]

const CHUNK_SIZE = 1000 // per-request size when fetching "All"

export default function InvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize, setPageSize] = useState<number | 'ALL'>(10)

  const [showSearch, setShowSearch] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [invoiceCounts, setInvoiceCounts] = useState<{ total: number, byType: Record<string, number>, byStatus: Record<string, number> }>({ total: 0, byType: {}, byStatus: {} })

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Cancels an in-flight "All" fetch loop if filters change mid-fetch
  const fetchIdRef = useRef(0)

  const buildQuery = (p: number, limit: number) => {
    const params = new URLSearchParams({
      page: String(p),
      limit: String(limit),
      type: typeFilter,
      status: statusFilter,
    })
    if (search) params.set('search', search)
    return params.toString()
  }

  // Normal paginated fetch (10 / 25 / 100)
  const fetchInvoicesPaginated = async (token: string, currentPage: number, limit: number) => {
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invoices?${buildQuery(currentPage, limit)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setInvoices(data.data)
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

    try {
      while (loaded < total) {
        if (fetchIdRef.current !== myFetchId) return // filters changed, abort this run
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invoices?${buildQuery(currentPage, CHUNK_SIZE)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!data.success) break

        total = data.pagination?.total || 0
        setTotalCount(total)
        setInvoices(prev => [...prev, ...data.data])
        loaded += data.data.length
        currentPage += 1
        if (data.data.length === 0) break // safety exit
        if (currentPage === 2) setLoading(false) // let the table start rendering after first chunk
        else setLoadingMore(true)
      }
    } catch {
      console.log('Failed to fetch invoices')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const fetchInvoices = async (token: string, currentPage: number, currentPageSize: number | 'ALL') => {
    if (currentPageSize === 'ALL') {
      await fetchInvoicesAll(token)
    } else {
      await fetchInvoicesPaginated(token, currentPage, currentPageSize)
    }
  }

  // Single source of truth for fetching: fires once per actual change to
  // page, pageSize, typeFilter, statusFilter, or search. Page-reset on
  // filter change is handled by the filter handlers below (not a separate
  // effect), so changing a filter triggers exactly ONE fetch, not two.
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }
    fetchInvoices(token, page, pageSize)
    fetchInvoiceCounts(token)
  }, [page, pageSize, typeFilter, statusFilter, search])

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    const token = localStorage.getItem('token')
    if (token) fetchInvoicesPaginated(token, newPage, pageSize as number)
  }

  const handlePageSizeChange = (newSize: number | 'ALL') => {
    setPageSize(newSize)
    setPage(1)
  }

  // These reset page to 1 in the SAME update as the filter change, instead
  // of via a separate effect — that separate effect was the cause of the
  // "takes so long" slowness (it fired a second full fetch right after the
  // first one, doubling load time, especially painful in "All" mode).
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

  const fetchInvoiceCounts = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invoices/counts`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) setInvoiceCounts(data.data)
    } catch {
      console.log('Failed to fetch invoice counts')
    }
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

  const handleSubmitFBR = async (e: React.MouseEvent, invoiceId: string) => {
    e.stopPropagation()
    const token = localStorage.getItem('token')
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invoices/${invoiceId}/submit-fbr`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (data.success) {
      router.push(`/invoices/${invoiceId}`)
    } else {
      setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, _error: data.message } : inv))
    }
  }

  const handleDeleteInvoice = async (e: React.MouseEvent, invoiceId: string) => {
    e.stopPropagation()
    const token = localStorage.getItem('token')
    setDeletingId(invoiceId)
    setConfirmDeleteId(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invoices/${invoiceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setInvoices(prev => prev.filter(inv => inv.id !== invoiceId))
        setTotalCount(prev => Math.max(0, prev - 1))
        if (token) fetchInvoiceCounts(token)
      } else {
        alert(data.message || 'Failed to delete invoice')
      }
    } catch {
      alert('Failed to delete invoice. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  // True whenever a type/status/search filter is narrowing the result set.
  const isFiltering = typeFilter !== 'ALL' || statusFilter !== 'ALL' || search !== ''

  // Build parent/amendment tree for the UNFILTERED view. This nesting only
  // makes sense when we have the full data — under a filter, the server
  // may return a parent without its amendment (or vice versa) since they
  // don't both match the filter, which used to make rows silently vanish
  // from the tree. So the tree is only used when no filter is active.
  const tree = useMemo(() => {
    const parents = invoices.filter(inv => !inv.originalInvoiceId)
    const amendments = invoices.filter(inv => !!inv.originalInvoiceId)
    return parents.map(parent => ({
      ...parent,
      amendments: amendments.filter(a => a.originalInvoiceId === parent.id),
    }))
  }, [invoices])

  // Under a filter/search, show a flat list of exactly what matched —
  // no forced nesting, so nothing that matched the filter goes missing.
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
  const typeCount = (value: string) => value === 'ALL' ? invoiceCounts.total : (invoiceCounts.byType[value] || 0)
  const statusCount = (value: string) => value === 'ALL' ? invoiceCounts.total : (invoiceCounts.byStatus[value] || 0)

  const InvoiceRow = ({ invoice, isAmendment = false }: { invoice: any, isAmendment?: boolean }) => {
    const typeInfo = getTypeLabel(invoice.invoiceType)
    return (
      <tr
        onClick={() => router.push(`/invoices/${invoice.id}`)}
        className={`border-t border-border hover:bg-border-light transition cursor-pointer ${isAmendment ? 'bg-surface-alt' : ''}`}
      >
        <td className="px-4 py-4 break-all">
          <div className="flex items-center gap-2">
            {isAmendment && <span className="text-muted text-lg leading-none">└─</span>}
            <span className="font-mono text-xs text-muted">{invoice.id.slice(0, 12)}...</span>
          </div>
        </td>
        <td className="px-4 py-4 text-sm">{new Date(invoice.invoiceDate).toLocaleDateString()}</td>
        <td className="px-4 py-4 text-sm">
          <span className={`text-xs font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
        </td>
        <td className="px-4 py-4 text-sm break-words">{invoice.buyerName || 'Walk-in Customer'}</td>
        <td className="px-4 py-4 font-semibold">PKR {Number(invoice.totalAmount).toFixed(2)}</td>
        <td className="px-4 py-4 text-success-text">PKR {Number(invoice.totalSalesTax).toFixed(2)}</td>
        <td className="px-4 py-4">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(invoice.status)}`}>
            {invoice.status}
          </span>
        </td>
        <td className="px-4 py-4 font-mono text-xs text-link break-all">{invoice.fbrInvoiceNo || '—'}</td>
        <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              {(invoice.status === 'PENDING' || invoice.status === 'FAILED' || invoice.status === 'DRAFT') && (
                <button onClick={e => handleSubmitFBR(e, invoice.id)} className="text-link hover:opacity-70 text-xs font-semibold transition underline">
                  Submit
                </button>
              )}
              {invoice.status === 'SENT'    && <span className="text-success-text text-xs">Submitted</span>}
              {invoice.status === 'AMENDED' && <span className="text-muted text-xs">Amended</span>}
              {invoice.status === 'FAILED'  && <span className="text-error-text text-xs">✗ Failed</span>}
              {invoice.status !== 'SENT' && invoice.status !== 'AMENDED' && confirmDeleteId !== invoice.id && (
                <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(invoice.id) }} className="text-muted hover:text-error-text text-xs font-semibold transition underline">
                  Delete
                </button>
              )}
            </div>
            {invoice.status !== 'SENT' && invoice.status !== 'AMENDED' && confirmDeleteId === invoice.id && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Sure?</span>
                <button onClick={e => handleDeleteInvoice(e, invoice.id)} disabled={deletingId === invoice.id} className="text-error-text hover:opacity-70 text-xs font-semibold transition underline disabled:opacity-40 disabled:cursor-not-allowed">
                  {deletingId === invoice.id ? '...' : 'Yes'}
                </button>
                <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(null) }} className="text-muted hover:text-heading text-xs font-semibold transition underline">
                  No
                </button>
              </div>
            )}
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div className="min-h-screen bg-background text-heading p-8">
      <div className="max-w-7xl mx-auto">

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Invoices</h1>
            <p className="text-muted">All your FBR invoices</p>
          </div>
          <button onClick={() => router.push('/create')} className="bg-btn-dark hover:bg-btn-dark-hover text-btn-dark-text px-6 py-3 rounded-lg font-semibold transition">
            New Invoice
          </button>
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
              {totalCount} total invoices
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
                          onClick={() => { setShowSearch(false); router.push(`/invoices/${inv.id}`) }}
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
                    <th className="text-left px-4 py-4 text-muted text-sm w-[13%]">Invoice ID</th>
                    <th className="text-left px-4 py-4 text-muted text-sm w-[10%]">Date</th>
                    <th className="text-left px-4 py-4 text-muted text-sm w-[9%]">Type</th>
                    <th className="text-left px-4 py-4 text-muted text-sm w-[13%]">Buyer</th>
                    <th className="text-left px-4 py-4 text-muted text-sm w-[11%]">Amount</th>
                    <th className="text-left px-4 py-4 text-muted text-sm w-[10%]">Tax</th>
                    <th className="text-left px-4 py-4 text-muted text-sm w-[9%]">Status</th>
                    <th className="text-left px-4 py-4 text-muted text-sm w-[13%]">FBR No.</th>
                    <th className="text-left px-4 py-4 text-muted text-sm w-[12%]">Action</th>
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
              {loadingMore && (
                <div className="text-center py-2 text-sm text-muted border-t border-border">Loading more invoices…</div>
              )}
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
    </div>
  )
}