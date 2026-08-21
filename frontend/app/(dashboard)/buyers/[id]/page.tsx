'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function BuyerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [buyer, setBuyer] = useState<any>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }
    fetchData(token)
  }, [])

  const fetchData = async (token: string) => {
    setLoading(true)
    setError('')
    try {
      const [buyerRes, invoicesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/buyers/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invoices?buyerId=${params.id}&limit=1000`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])
      const buyerData = await buyerRes.json()
      const invoicesData = await invoicesRes.json()

      if (buyerData.success) setBuyer(buyerData.data)
      else setError('Buyer not found')

      if (invoicesData.success) setInvoices(invoicesData.data)
    } catch {
      setError('Cannot reach server')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT':    return 'text-success-text bg-success-bg'
      case 'PENDING': return 'text-warning-text bg-warning-bg'
      case 'FAILED':  return 'text-error-text bg-error-bg'
      case 'AMENDED': return 'text-muted bg-border-light'
      case 'EDITED':  return 'text-muted bg-border-light'
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

  if (loading) return (
    <div className="min-h-screen bg-background text-heading flex items-center justify-center">
      <p className="text-muted">Loading buyer...</p>
    </div>
  )

  if (error || !buyer) return (
    <div className="min-h-screen bg-background text-heading flex items-center justify-center">
      <p className="text-muted">{error || 'Buyer not found'}</p>
    </div>
  )

  const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0)
  const totalTax = invoices.reduce((sum, inv) => sum + Number(inv.totalSalesTax || 0), 0)

  return (
    <div className="min-h-screen bg-background text-heading p-8">
      <div className="max-w-7xl mx-auto">

        <button
          onClick={() => router.push('/buyers')}
          className="text-muted hover:text-heading text-sm mb-4 inline-flex items-center gap-1 transition"
        >
          ← Back to Buyers
        </button>

        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{buyer.buyerName}</h1>
            <p className="text-muted text-sm">
              {buyer.buyerNtn || buyer.buyerCnic || 'No NTN/CNIC on file'} · {buyer.buyerType || 'Unregistered'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-muted text-xs uppercase tracking-wide mb-1">Total Billed</p>
            <p className="text-2xl font-bold">PKR {totalAmount.toFixed(2)}</p>
            <p className="text-muted text-xs mt-1">Tax: PKR {totalTax.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-6 border border-border shadow-sm mb-6 grid grid-cols-3 gap-6">
          <div>
            <p className="text-muted text-xs uppercase tracking-wide mb-1">Phone</p>
            <p className="text-heading text-sm">{buyer.phone || '—'}</p>
          </div>
          <div>
            <p className="text-muted text-xs uppercase tracking-wide mb-1">Email</p>
            <p className="text-heading text-sm">{buyer.email || '—'}</p>
          </div>
          <div>
            <p className="text-muted text-xs uppercase tracking-wide mb-1">Address</p>
            <p className="text-heading text-sm">{buyer.address || '—'}</p>
          </div>
        </div>

        <h2 className="text-lg font-semibold mb-4">Invoices ({invoices.length})</h2>

        {invoices.length === 0 ? (
          <div className="bg-surface rounded-lg p-12 border border-border text-center">
            <p className="text-muted text-lg">No invoices for this buyer yet</p>
          </div>
        ) : (
          <div className="bg-surface rounded-lg border border-border overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-border-light">
                <tr>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[13%]">Invoice ID</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[10%]">Date</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[9%]">Type</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[14%]">Amount</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[13%]">Tax</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[9%]">Status</th>
                  <th className="text-left px-4 py-4 text-muted text-sm w-[13%]">FBR No.</th>
                </tr>
              </thead>
              <tbody>
                {invoices
                  .slice()
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map(inv => {
                    const typeInfo = getTypeLabel(inv.invoiceType)
                    return (
                      <tr
                        key={inv.id}
                        onClick={() => router.push(`/invoices/${inv.id}`)}
                        className="border-t border-border hover:bg-border-light transition cursor-pointer"
                      >
                        <td className="px-4 py-4 font-mono text-xs text-muted break-all">{inv.id.slice(0, 12)}...</td>
                        <td className="px-4 py-4 text-sm">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                        <td className="px-4 py-4 text-sm">
                          <span className={`text-xs font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
                        </td>
                        <td className="px-4 py-4 font-semibold whitespace-nowrap">PKR {Number(inv.totalAmount).toFixed(2)}</td>
                        <td className="px-4 py-4 text-success-text whitespace-nowrap">PKR {Number(inv.totalSalesTax).toFixed(2)}</td>
                        <td className="px-4 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(inv.status)}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-mono text-xs text-link break-all">{inv.fbrInvoiceNo || '—'}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}