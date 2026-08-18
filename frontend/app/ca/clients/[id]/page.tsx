'use client'

import { useState, useEffect, useRef } from 'react'
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
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [profileOpen, setProfileOpen] = useState(false)
  const [invoicesOpen, setInvoicesOpen] = useState(false)

  const [invoicePage, setInvoicePage] = useState(1)
  const [invoicePageSize, setInvoicePageSize] = useState<number | 'ALL'>(10)
  const [invoiceTotal, setInvoiceTotal] = useState(0)

  // Cancels an in-flight "All" fetch loop if the page/pageSize changes mid-fetch
  const fetchIdRef = useRef(0)

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

  const fetchInvoicesPaginated = async (token: string, currentPage: number, limit: number) => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/ca/client/${clientId}/invoices?page=${currentPage}&limit=${limit}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
    const data = await res.json()
    if (data.success) {
      setInvoices(Array.isArray(data.data) ? data.data : [])
      setInvoiceTotal(data.pagination?.total || 0)
    }
  }

  const fetchInvoicesAll = async (token: string) => {
    const myFetchId = ++fetchIdRef.current
    setInvoices([])
    let currentPage = 1
    let total = Infinity
    let loaded = 0
    let accumulated: any[] = []

    while (loaded < total) {
      if (fetchIdRef.current !== myFetchId) return // stale request, abort
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/ca/client/${clientId}/invoices?page=${currentPage}&limit=${CHUNK_SIZE}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const data = await res.json()
      if (!data.success) break

      total = data.pagination?.total || 0
      setInvoiceTotal(total)
      accumulated = accumulated.concat(data.data)
      loaded += data.data.length
      currentPage += 1
      if (data.data.length === 0) break // safety exit
    }
    setInvoices(accumulated)
  }

  const fetchData = async (token: string, page: number, size: number | 'ALL') => {
    try {
      await fetchClient(token)
      if (size === 'ALL') {
        await fetchInvoicesAll(token)
      } else {
        await fetchInvoicesPaginated(token, page, size)
      }
    } catch (err) {
      setError('Cannot connect to server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    fetchData(token, invoicePage, invoicePageSize)
  }, [clientId, invoicePage, invoicePageSize])

  const handlePageChange = (newPage: number) => {
    setInvoicePage(newPage)
  }

  const handlePageSizeChange = (newSize: number | 'ALL') => {
    setInvoicePageSize(newSize)
    setInvoicePage(1)
  }

  if (loading) return <p className="text-muted">Loading client...</p>
  if (error) return <p className="text-error-text">{error}</p>
  if (!client) return null

  return (
    <div className="max-w-5xl">
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
        <div className="w-full flex items-center justify-between px-6 py-4">
          <button
            onClick={() => setInvoicesOpen(v => !v)}
            className="flex items-center gap-2 text-left hover:opacity-80 transition"
          >
            <span className="font-semibold text-heading">
              {invoicesOpen ? 'Hide Invoices' : 'View Invoices'}
            </span>
            <span className={`text-muted transition-transform ${invoicesOpen ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {invoicesOpen && (
            <div className="flex items-center gap-3">
              <span className="text-muted text-sm">{invoiceTotal} total</span>
              <div className="w-20">
                <StyledSelect
                  options={PAGE_SIZE_OPTIONS}
                  value={PAGE_SIZE_OPTIONS.find(o => o.value === String(invoicePageSize))}
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
          )}
        </div>

        {invoicesOpen && (
          <div className="border-t border-border overflow-x-auto">
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
                {invoices.length > 0 ? (
                  invoices.map(inv => {
                    const typeInfo = getTypeLabel(inv.invoiceType)
                    return (
                      <tr key={inv.id} className="border-t border-border">
                        <td className="px-4 py-4 font-mono text-xs text-muted break-all">
                          {inv.id.slice(0, 12)}...
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <span className={`text-xs font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
                        </td>
                        <td className="px-4 py-4 text-sm break-words">
                          {inv.buyerName || 'Walk-in Customer'}
                        </td>
                        <td className="px-4 py-4 font-semibold text-sm">
                          PKR {Number(inv.totalAmount).toFixed(2)}
                        </td>
                        <td className="px-4 py-4 text-success-text text-sm">
                          PKR {Number(inv.totalSalesTax || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(inv.status)}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-mono text-xs text-link break-all">
                          {inv.fbrInvoiceNo || '—'}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-muted">
                      No invoices yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {invoicePageSize !== 'ALL' && invoiceTotal > (invoicePageSize as number) && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-muted text-sm">
                  Page {invoicePage} of {Math.ceil(invoiceTotal / (invoicePageSize as number))} — {invoiceTotal} total invoices
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(Math.max(1, invoicePage - 1))}
                    disabled={invoicePage === 1}
                    className="w-7 h-7 flex items-center justify-center rounded text-muted hover:text-heading disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    ←
                  </button>
                  <span className="w-7 h-7 flex items-center justify-center rounded bg-btn-dark text-btn-dark-text text-xs font-semibold">
                    {invoicePage}
                  </span>
                  <button
                    onClick={() => handlePageChange(invoicePage + 1)}
                    disabled={invoicePage * (invoicePageSize as number) >= invoiceTotal}
                    className="w-7 h-7 flex items-center justify-center rounded text-muted hover:text-heading disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}