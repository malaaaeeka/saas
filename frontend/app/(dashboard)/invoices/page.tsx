'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const PAGE_SIZE = 10

export default function InvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // ---- toaman-style search overlay + filter panel ----
  const [showSearch, setShowSearch] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [invoiceCounts, setInvoiceCounts] = useState<{ total: number, byType: Record<string, number>, byStatus: Record<string, number> }>({ total: 0, byType: {}, byStatus: {} })

  // ---- delete flow ----
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }
    fetchInvoices(token, page)
    fetchInvoiceCounts(token)
  }, [page])

  const fetchInvoices = async (token: string, currentPage: number) => {
    setLoading(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/invoices?page=${currentPage}&limit=${PAGE_SIZE}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const data = await res.json()
      if (data.success) {
        setInvoices(data.data)
        setTotalCount(data.pagination?.total || 0)
      }
    } catch (err) {
      console.log('Failed to fetch invoices')
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    const token = localStorage.getItem('token')
    if (token) fetchInvoices(token, newPage)
  }

  // Fetches accurate Type/Status counts directly from the database via a
  // dedicated backend endpoint — scales correctly no matter how many
  // invoices exist, unlike fetching a large page and counting client-side.
  const fetchInvoiceCounts = async (token: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/invoices/counts`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const data = await res.json()
      if (data.success) {
        setInvoiceCounts(data.data)
      }
    } catch (err) {
      console.log('Failed to fetch invoice counts')
    }
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [typeFilter, statusFilter, search])

  const buildInvoiceTree = (flat: any[]) => {
    const parents = flat.filter(inv => !inv.originalInvoiceId)
    const amendments = flat.filter(inv => !!inv.originalInvoiceId)
    return parents.map(parent => ({
      ...parent,
      amendments: amendments.filter(a => a.originalInvoiceId === parent.id)
    }))
  }

  const applyFilters = (tree: any[]) => {
    return tree.filter(parent => {
      const matchType   = typeFilter === 'ALL' || parent.invoiceType === typeFilter
      const matchStatus = statusFilter === 'ALL' || parent.status === statusFilter
      const matchSearch = search === '' ||
        parent.buyerName?.toLowerCase().includes(search.toLowerCase()) ||
        parent.fbrInvoiceNo?.toLowerCase().includes(search.toLowerCase()) ||
        parent.id.toLowerCase().includes(search.toLowerCase())

      const amendmentMatches = parent.amendments?.some((a: any) => {
        const aType   = typeFilter === 'ALL' || a.invoiceType === typeFilter
        const aStatus = statusFilter === 'ALL' || a.status === statusFilter
        const aSearch = search === '' ||
          a.buyerName?.toLowerCase().includes(search.toLowerCase()) ||
          a.fbrInvoiceNo?.toLowerCase().includes(search.toLowerCase()) ||
          a.id.toLowerCase().includes(search.toLowerCase())
        return aType && aStatus && aSearch
      })

      return (matchType && matchStatus && matchSearch) || amendmentMatches
    })
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
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (data.success) {
      router.push(`/invoices/${invoiceId}`)
    } else {
      setInvoices(prev => prev.map(inv =>
        inv.id === invoiceId ? { ...inv, _error: data.message } : inv
      ))
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
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setInvoices(prev => prev.filter(inv => inv.id !== invoiceId))
        setTotalCount(prev => Math.max(0, prev - 1))
        if (token) fetchInvoiceCounts(token)
      } else {
        alert(data.message || 'Failed to delete invoice')
      }
    } catch (err) {
      console.log('Failed to delete invoice')
      alert('Failed to delete invoice. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const tree = buildInvoiceTree(invoices)
  const filtered = applyFilters(tree)
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // ---- counts for the filter panel (based on currently loaded page of invoices) ----
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
  const typeCount = (value: string) =>
    value === 'ALL' ? invoiceCounts.total : (invoiceCounts.byType[value] || 0)
  const statusCount = (value: string) =>
    value === 'ALL' ? invoiceCounts.total : (invoiceCounts.byStatus[value] || 0)

  const InvoiceRow = ({ invoice, isAmendment = false }: { invoice: any, isAmendment?: boolean }) => {
    const typeInfo = getTypeLabel(invoice.invoiceType)
    return (
      <tr
        onClick={() => router.push(`/invoices/${invoice.id}`)}
        className={`border-t border-border hover:bg-border-light transition cursor-pointer ${isAmendment ? 'bg-surface-alt' : ''}`}
      >
        <td className="px-2 py-3">
  <div className="flex items-center gap-1">
    {isAmendment && <span className="text-muted text-sm leading-none">└</span>}
    <span className="font-mono text-[10px] text-muted">{invoice.id.slice(0, 6)}</span>
  </div>
</td>
        <td className="px-2 py-3 text-sm">{new Date(invoice.invoiceDate).toLocaleDateString()}</td>
        <td className="px-2 py-3 text-sm">
          <span className={`text-xs font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
        </td>
        <td className="px-2 py-3 text-sm">{invoice.buyerName || 'Walk-in Customer'}</td>
       <td className="px-2 py-3">
  <div className="font-semibold text-xs">{Number(invoice.totalAmount).toFixed(0)}</div>
  <div className="text-success-text text-[10px]">Tax {Number(invoice.totalSalesTax).toFixed(0)}</div>
</td>
       <td className="px-2 py-3">
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusColor(invoice.status)}`}>
    {invoice.status}
  </span>
  {invoice.fbrInvoiceNo && (
    <div className="font-mono text-[9px] text-link mt-1 truncate">{invoice.fbrInvoiceNo}</div>
  )}
</td>
        <td className="px-2 py-3" onClick={e => e.stopPropagation()}>
  <div className="flex items-center gap-1.5">
          {(invoice.status === 'PENDING' || invoice.status === 'FAILED' || invoice.status === 'DRAFT') && (
           <button
  onClick={e => handleSubmitFBR(e, invoice.id)}
  title="Submit"
  className="w-6 h-6 flex items-center justify-center rounded hover:bg-border-light text-link"
>
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
  </svg>
</button>
          )}
          {invoice.status === 'SENT'    && <span className="text-success-text text-xs">Submitted</span>}
          {invoice.status === 'AMENDED' && <span className="text-muted text-xs">Amended</span>}
          {invoice.status === 'FAILED'  && <span className="text-error-text text-xs">✗ Failed</span>}

       {invoice.status !== 'SENT' && invoice.status !== 'AMENDED' && (
  confirmDeleteId === invoice.id ? (
    <span className="flex items-center gap-1.5">
      <button
        onClick={e => handleDeleteInvoice(e, invoice.id)}
        disabled={deletingId === invoice.id}
        title="Confirm delete"
        className="w-6 h-6 flex items-center justify-center rounded bg-error-bg text-error-text hover:opacity-70 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {deletingId === invoice.id ? (
          <span className="text-[10px]">...</span>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
      <button
        onClick={e => { e.stopPropagation(); setConfirmDeleteId(null) }}
        title="Cancel"
        className="w-6 h-6 flex items-center justify-center rounded bg-border-light text-muted hover:text-heading transition"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </span>
  ) : (
    <button
  onClick={e => { e.stopPropagation(); setConfirmDeleteId(invoice.id) }}
  title="Delete"
  className="w-6 h-6 flex items-center justify-center rounded hover:bg-error-bg text-error-text"
>
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
  </svg>
</button>
  )
)}
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div className="min-h-screen bg-background text-heading p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Invoices</h1>
            <p className="text-muted">All your FBR invoices</p>
          </div>
          <button
            onClick={() => router.push('/create')}
            className="bg-btn-dark hover:bg-btn-dark-hover text-btn-dark-text px-6 py-3 rounded-lg font-semibold transition"
          >
             New Invoice
          </button>
        </div>

        {/* Search + Filter & Sort trigger row */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
          <div className="flex items-center gap-6">
            <button
              onClick={() => { setShowSearch(v => !v); setShowFilterPanel(false) }}
              className="flex items-center gap-2 text-sm text-muted hover:text-heading transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Search
            </button>
            <button
              onClick={() => { setShowFilterPanel(v => !v); setShowSearch(false) }}
              className="flex items-center gap-2 text-sm text-muted hover:text-heading transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="8" y1="12" x2="16" y2="12" />
                <line x1="11" y1="18" x2="13" y2="18" />
              </svg>
             Filter & Sort
            </button>
          </div>
          <span className="text-muted text-sm">{totalCount} total invoices</span>
        </div>

        {/* Search overlay — full screen takeover, matching toaman's search UI */}
        {showSearch && (
          <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-8 py-12">
              <div className="flex justify-between items-center mb-8">
                <span className="text-xs text-muted uppercase tracking-widest">Search Invoices</span>
                <button
                  onClick={() => setShowSearch(false)}
                  className="text-muted hover:text-heading text-2xl leading-none"
                >
                  ✕
                </button>
              </div>

              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search"
                className="w-full bg-transparent text-6xl italic font-serif text-heading placeholder-border border-b border-border focus:outline-none pb-4 mb-2"
              />

              {search === '' ? (
                <p className="text-muted text-sm mt-4">Start typing to search invoices...</p>
              ) : (
                <div className="mt-8">
                  {invoices.filter(inv =>
                    inv.buyerName?.toLowerCase().includes(search.toLowerCase()) ||
                    inv.fbrInvoiceNo?.toLowerCase().includes(search.toLowerCase()) ||
                    inv.id.toLowerCase().includes(search.toLowerCase())
                  ).length === 0 ? (
                    <p className="text-muted text-sm">No invoices match "{search}"</p>
                  ) : (
                    invoices
                      .filter(inv =>
                        inv.buyerName?.toLowerCase().includes(search.toLowerCase()) ||
                        inv.fbrInvoiceNo?.toLowerCase().includes(search.toLowerCase()) ||
                        inv.id.toLowerCase().includes(search.toLowerCase())
                      )
                      .map(inv => {
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

        {/* Filter & Sort panel */}
        {showFilterPanel && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-xs text-muted uppercase tracking-wide mb-3">Type</p>
              <div className="flex flex-col gap-2">
                {typeOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setTypeFilter(opt.value)}
                    className={`text-left text-sm transition ${
                      typeFilter === opt.value ? 'text-heading font-semibold underline' : 'text-muted hover:text-heading'
                    }`}
                  >
                    {opt.label} ({typeCount(opt.value)})
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wide mb-3">Status</p>
              <div className="flex flex-col gap-2">
                {statusOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setStatusFilter(opt.value)}
                    className={`text-left text-sm transition ${
                      statusFilter === opt.value ? 'text-heading font-semibold underline' : 'text-muted hover:text-heading'
                    }`}
                  >
                    {opt.label} ({statusCount(opt.value)})
                  </button>
                ))}
              </div>
            </div>
           
          </div>
        )}

        {/* Table */}
        {loading ? (
          <p className="text-muted">Loading invoices...</p>
        ) : invoices.length === 0 && page === 1 ? (
          <div className="bg-surface rounded-lg p-12 border border-border text-center">
            <p className="text-muted text-lg mb-4">No invoices yet</p>
            <button
              onClick={() => router.push('/create')}
              className="bg-btn-dark hover:bg-btn-dark-hover text-btn-dark-text px-6 py-3 rounded-lg font-semibold transition"
            >
              Create Your First Invoice
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-surface rounded-lg p-12 border border-border text-center">
            <p className="text-muted text-lg mb-2">No invoices match your filters</p>
            <button
              onClick={() => { setTypeFilter('ALL'); setStatusFilter('ALL'); setSearch('') }}
              className="text-link hover:opacity-70 text-sm transition"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="bg-surface rounded-lg border border-border mb-4">
  <table className="w-full table-fixed">
                <thead className="bg-border-light">
                 <tr>
  <th className="text-left px-2 py-3 text-muted text-xs w-20">ID</th>
  <th className="text-left px-2 py-3 text-muted text-xs w-20">Date</th>
  <th className="text-left px-2 py-3 text-muted text-xs w-16">Type</th>
  <th className="text-left px-2 py-3 text-muted text-xs">Buyer</th>
  <th className="text-left px-2 py-3 text-muted text-xs w-24">Amount</th>
  <th className="text-left px-2 py-3 text-muted text-xs w-24">Status</th>
  <th className="text-left px-2 py-3 text-muted text-xs w-16">Action</th>
</tr>
                </thead>
                <tbody>
                  {filtered.map(parent => (
                    <>
                      <InvoiceRow key={parent.id} invoice={parent} />
                      {parent.amendments.map((amendment: any) => (
                        <InvoiceRow key={amendment.id} invoice={amendment} isAmendment={true} />
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-muted text-sm">
                  Page {page} of {totalPages} — showing {invoices.length} invoices
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={page === 1}
                    className="px-3 py-2 rounded-lg text-sm bg-surface border border-border hover:border-heading text-heading disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    «
                  </button>
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className="px-4 py-2 rounded-lg text-sm bg-surface border border-border hover:border-heading text-heading disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    ← Prev
                  </button>

                  {/* Page number buttons */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce((acc: (number | string)[], p, idx, arr) => {
                      if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...')
                      acc.push(p)
                      return acc
                    }, [])
                    .map((p, idx) =>
                      p === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-3 py-2 text-muted text-sm">...</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => handlePageChange(p as number)}
                          className={`px-4 py-2 rounded-lg text-sm transition ${
                            page === p
                              ? 'bg-btn-dark text-btn-dark-text'
                              : 'bg-surface border border-border hover:border-heading text-body'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )
                  }

                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                    className="px-4 py-2 rounded-lg text-sm bg-surface border border-border hover:border-heading text-heading disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Next →
                  </button>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={page === totalPages}
                    className="px-3 py-2 rounded-lg text-sm bg-surface border border-border hover:border-heading text-heading disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}