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

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }
    fetchInvoices(token, page)
  }, [page])

  const fetchInvoices = async (token: string, currentPage: number) => {
    setLoading(true)
    try {
      const res = await fetch(
        `http://localhost:5000/api/invoices?page=${currentPage}&limit=${PAGE_SIZE}`,
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
      case 'SENT':    return 'text-green-400 bg-green-500/10'
      case 'PENDING': return 'text-yellow-400 bg-yellow-500/10'
      case 'FAILED':  return 'text-red-400 bg-red-500/10'
      case 'AMENDED': return 'text-gray-400 bg-gray-500/10'
      default:        return 'text-gray-400 bg-gray-500/10'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'SALE':        return { label: 'Sale',        color: 'text-blue-400' }
      case 'PURCHASE':    return { label: 'Purchase',    color: 'text-purple-400' }
      case 'CREDIT_NOTE': return { label: 'Credit Note', color: 'text-red-400' }
      case 'DEBIT_NOTE':  return { label: 'Debit Note',  color: 'text-orange-400' }
      default:            return { label: type,          color: 'text-gray-400' }
    }
  }

  const handleSubmitFBR = async (e: React.MouseEvent, invoiceId: string) => {
    e.stopPropagation()
    const token = localStorage.getItem('token')
    const res = await fetch(`http://localhost:5000/api/invoices/${invoiceId}/submit-fbr`, {
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

  const tree = buildInvoiceTree(invoices)
  const filtered = applyFilters(tree)
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const InvoiceRow = ({ invoice, isAmendment = false }: { invoice: any, isAmendment?: boolean }) => {
    const typeInfo = getTypeLabel(invoice.invoiceType)
    return (
      <tr
        onClick={() => router.push(`/invoices/${invoice.id}`)}
        className={`border-t border-gray-800 hover:bg-gray-800/50 transition cursor-pointer ${isAmendment ? 'bg-gray-900/70' : ''}`}
      >
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            {isAmendment && <span className="text-gray-600 text-lg leading-none">└─</span>}
            <span className="font-mono text-xs text-gray-400">{invoice.id.slice(0, 12)}...</span>
          </div>
        </td>
        <td className="px-6 py-4 text-sm">{new Date(invoice.invoiceDate).toLocaleDateString()}</td>
        <td className="px-6 py-4 text-sm">
          <span className={`text-xs font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
        </td>
        <td className="px-6 py-4 text-sm">{invoice.buyerName || 'Walk-in Customer'}</td>
        <td className="px-6 py-4 font-semibold">PKR {Number(invoice.totalAmount).toFixed(2)}</td>
        <td className="px-6 py-4 text-green-400">PKR {Number(invoice.totalSalesTax).toFixed(2)}</td>
        <td className="px-6 py-4">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(invoice.status)}`}>
            {invoice.status}
          </span>
        </td>
        <td className="px-6 py-4 font-mono text-xs text-blue-400">{invoice.fbrInvoiceNo || '—'}</td>
        <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
          {(invoice.status === 'PENDING' || invoice.status === 'FAILED') && (
            <button
              onClick={e => handleSubmitFBR(e, invoice.id)}
              className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-xs font-semibold transition"
            >
              Submit to FBR
            </button>
          )}
          {invoice.status === 'SENT'    && <span className="text-green-400 text-xs">✓ Submitted</span>}
          {invoice.status === 'AMENDED' && <span className="text-gray-400 text-xs">Amended</span>}
          {invoice.status === 'FAILED'  && <span className="text-red-400 text-xs">✗ Failed</span>}
        </td>
      </tr>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Invoices</h1>
            <p className="text-gray-400">All your FBR invoices</p>
          </div>
          <button
            onClick={() => router.push('/create')}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition"
          >
            + New Invoice
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="Search buyer, FBR no, ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition w-64"
          />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
          >
            <option value="ALL">All Types</option>
            <option value="SALE">Sale</option>
            <option value="PURCHASE">Purchase</option>
            <option value="DEBIT_NOTE">Debit Note</option>
            <option value="CREDIT_NOTE">Credit Note</option>
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="SENT">Sent</option>
            <option value="FAILED">Failed</option>
            <option value="AMENDED">Amended</option>
          </select>
          {(typeFilter !== 'ALL' || statusFilter !== 'ALL' || search !== '') && (
            <button
              onClick={() => { setTypeFilter('ALL'); setStatusFilter('ALL'); setSearch('') }}
              className="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-4 py-2 rounded-lg text-sm transition"
            >
              ✕ Clear
            </button>
          )}
          <span className="ml-auto text-gray-500 text-sm self-center">
            {totalCount} total invoices
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-gray-400">Loading invoices...</p>
        ) : invoices.length === 0 && page === 1 ? (
          <div className="bg-gray-900 rounded-lg p-12 border border-gray-800 text-center">
            <p className="text-gray-400 text-lg mb-4">No invoices yet</p>
            <button
              onClick={() => router.push('/create')}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition"
            >
              Create Your First Invoice
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-gray-900 rounded-lg p-12 border border-gray-800 text-center">
            <p className="text-gray-400 text-lg mb-2">No invoices match your filters</p>
            <button
              onClick={() => { setTypeFilter('ALL'); setStatusFilter('ALL'); setSearch('') }}
              className="text-blue-400 hover:text-blue-300 text-sm transition"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden mb-4">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="text-left px-6 py-4 text-gray-400 text-sm">Invoice ID</th>
                    <th className="text-left px-6 py-4 text-gray-400 text-sm">Date</th>
                    <th className="text-left px-6 py-4 text-gray-400 text-sm">Type</th>
                    <th className="text-left px-6 py-4 text-gray-400 text-sm">Buyer</th>
                    <th className="text-left px-6 py-4 text-gray-400 text-sm">Amount</th>
                    <th className="text-left px-6 py-4 text-gray-400 text-sm">Tax</th>
                    <th className="text-left px-6 py-4 text-gray-400 text-sm">Status</th>
                    <th className="text-left px-6 py-4 text-gray-400 text-sm">FBR No.</th>
                    <th className="text-left px-6 py-4 text-gray-400 text-sm">Action</th>
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
                <p className="text-gray-500 text-sm">
                  Page {page} of {totalPages} — showing {invoices.length} invoices
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={page === 1}
                    className="px-3 py-2 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    «
                  </button>
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className="px-4 py-2 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
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
                        <span key={`ellipsis-${idx}`} className="px-3 py-2 text-gray-500 text-sm">...</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => handlePageChange(p as number)}
                          className={`px-4 py-2 rounded-lg text-sm transition ${
                            page === p
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
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
                    className="px-4 py-2 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Next →
                  </button>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={page === totalPages}
                    className="px-3 py-2 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
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