'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'SENT', label: 'Sent' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'RETRY', label: 'Retry' },
]

export default function InvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState('ALL')

  const [filterOpen, setFilterOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')

    if (!token || !user) {
      router.push('/login')
      return
    }

    const userData = JSON.parse(user)
    if (userData.role !== 'SUPER_ADMIN') {
      router.push('/invoices')
      return
    }

    fetchInvoices(token, page, statusFilter)
  }, [page, statusFilter])

  const fetchInvoices = async (token: string, pageNum: number, status: string) => {
    try {
      const url = status === 'ALL'
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/admin/invoices?page=${pageNum}&limit=10`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/admin/invoices?page=${pageNum}&limit=10&status=${status}`

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setInvoices(Array.isArray(data.data) ? data.data : data.data?.data ?? [])
        setTotal(data.pagination?.total ?? data.data?.total ?? 0)
      }
    } catch (err) {
      console.error('Failed to fetch invoices')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'SENT': return 'bg-success-bg text-success-text'
      case 'FAILED': return 'bg-error-bg text-error-text'
      case 'PENDING': return 'bg-warning-bg text-warning-text'
      case 'RETRY': return 'bg-warning-bg text-warning-text'
      default: return 'bg-border-light text-body'
    }
  }

  // NOTE: same caveat as Users page — this only searches invoices already
  // loaded on the current page (10 at a time), since /api/admin/invoices
  // paginates server-side. For true cross-database search, add a `?search=`
  // param on that route (matching business name or invoice id) and call it
  // here instead of filtering client-side.
  const searchMatches = searchQuery.trim()
    ? invoices.filter(inv =>
        inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.business?.businessName || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  const visibleInvoices = searchQuery.trim()
    ? invoices.filter(inv =>
        inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.business?.businessName || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : invoices

  if (loading) return <p className="text-muted">Loading invoices...</p>

  return (
    <div className="max-w-7xl">
     <div className="mb-8">
  <h1 className="text-3xl font-bold mb-2">Invoices Overview</h1>
  <p className="text-muted mb-6">All system invoices</p>

  <div className="flex justify-between items-center pb-4 border-b border-border">
    <div className="flex items-center gap-6">
      <button
        onClick={() => setSearchOpen(true)}
        className="flex items-center gap-2 text-sm text-muted hover:text-heading transition"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        Search
      </button>
      <button
        onClick={() => setFilterOpen(o => !o)}
        className="flex items-center gap-2 text-sm text-muted hover:text-heading transition"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="6" y1="12" x2="18" y2="12" />
          <line x1="9" y1="18" x2="15" y2="18" />
        </svg>
        Filter &amp; Sort
      </button>
    </div>
    <span className="text-sm text-muted">{total} total invoices</span>
  </div>
</div>

      {/* Filter panel — replaces the old <select> dropdown */}
      {filterOpen && (
        <div className="mb-8 pb-6 border-b border-border">
          <p className="text-xs font-medium uppercase tracking-wide text-muted mb-3">Status</p>
          <div className="flex flex-col gap-1">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setStatusFilter(opt.value); setPage(1) }}
                className={`text-left text-sm py-1 w-fit transition ${
                  statusFilter === opt.value
                    ? 'text-heading font-medium underline underline-offset-4'
                    : 'text-muted hover:text-heading'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search overlay */}
      {searchOpen && (
        <div className="fixed inset-x-0 top-16 bottom-0 bg-background z-50 flex flex-col overflow-y-auto">
          <div className="flex items-center justify-between px-8 pt-6">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">Search invoices</span>
            <button
              onClick={() => { setSearchOpen(false); setSearchQuery('') }}
              className="text-muted hover:text-heading transition text-lg"
              aria-label="Close search"
            >
              ✕
            </button>
          </div>
          <div className="px-8 pt-3">
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-6xl italic font-serif text-heading placeholder-border border-b border-border focus:outline-none pb-4 mb-2"
            />
          </div>
          <div className="px-8 pt-6 overflow-y-auto flex-1">
            {searchQuery.trim() === '' ? (
              <p className="text-muted text-sm">Start typing to search the current page of invoices…</p>
            ) : searchMatches.length === 0 ? (
              <p className="text-muted text-sm">No matches on this page for "{searchQuery}"</p>
            ) : (
              searchMatches.map(inv => (
                <div
                  key={inv.id}
                  onClick={() => setSearchOpen(false)}
                  className="py-3 border-b border-border cursor-pointer hover:opacity-70 transition"
                >
                  <p className="text-heading text-sm font-mono">{inv.id.substring(0, 8)}...</p>
                  <p className="text-muted text-xs mt-0.5">
                    {inv.business?.businessName || 'N/A'} — PKR {Number(inv.totalAmount).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Invoices Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-border-light">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Invoice ID</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Business</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Amount</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleInvoices.length > 0 ? (
              visibleInvoices.map((inv) => (
                <tr key={inv.id} className="border-t border-border hover:bg-border-light/50">
                  <td className="px-6 py-4 text-sm font-mono">{inv.id.substring(0, 8)}...</td>
                  <td className="px-6 py-4">{inv.business?.businessName || 'N/A'}</td>
                  <td className="px-6 py-4 font-medium">
                    PKR {Number(inv.totalAmount).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded text-sm ${getStatusColor(inv.status)}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-link hover:opacity-70 text-sm">
                      View
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-muted">
                  No invoices found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex justify-between items-center">
        <p className="text-muted">
          Showing {visibleInvoices.length} of {total} invoices
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="bg-surface border border-border hover:border-heading text-heading disabled:opacity-50 px-4 py-2 rounded"
          >
            Previous
          </button>
          <span className="px-4 py-2">Page {page}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page * 10 >= total}
            className="bg-surface border border-border hover:border-heading text-heading disabled:opacity-50 px-4 py-2 rounded"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}