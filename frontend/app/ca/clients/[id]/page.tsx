'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'


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

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    fetchData(token)
  }, [clientId])

  const fetchData = async (token: string) => {
    try {
      const [clientRes, invoicesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ca/client/${clientId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ca/client/${clientId}/invoices`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      const clientData = await clientRes.json()
      const invoicesData = await invoicesRes.json()

      if (clientData.success) {
        setClient(clientData.data)
      } else {
        setError(clientData.message || 'Client not found')
      }

      if (invoicesData.success) {
        setInvoices(Array.isArray(invoicesData.data) ? invoicesData.data : [])
      }
    } catch (err) {
      setError('Cannot connect to server')
    } finally {
      setLoading(false)
    }
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
    </div>
  )}
</div>

    </div>
  )
}