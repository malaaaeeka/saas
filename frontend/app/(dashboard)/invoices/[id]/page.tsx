'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function InvoiceDetailPage() {
const [emailLoading, setEmailLoading] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [showEmailInput, setShowEmailInput] = useState(false)

  const router = useRouter()
  const params = useParams()
  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }
    fetchInvoice(token)
  }, [])

  // Tick every minute to keep the countdown live
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchInvoice = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invoices/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) setInvoice(data.data)
    } catch (err) {
      console.log('Failed to fetch invoice')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitToFBR = async () => {
    if (!confirm('Submit this invoice to FBR?')) return
    setSubmitLoading(true)
    setNotification(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/invoices/${invoice.id}/submit-fbr`,
        { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } }
      )
      const data = await res.json()
      if (data.success) {
        setNotification({ type: 'success', message: `Successfully submitted! FBR Invoice No: ${data.data.fbrInvoiceNo}` })
        fetchInvoice(token!)
      } else {
        setNotification({ type: 'error', message: data.message || 'Failed to submit to FBR' })
      }
    } catch {
      setNotification({ type: 'error', message: 'Cannot connect to server' })
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/invoices/${invoice.id}/pdf`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${invoice.id}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      setNotification({ type: 'error', message: 'Failed to download PDF' })
    }
  }
  const handleSendEmail = async () => {
    if (!emailInput || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
      setNotification({ type: 'error', message: 'Please enter a valid email address' })
      return
    }
    setEmailLoading(true)
    setNotification(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/invoices/${invoice.id}/send-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ buyerEmail: emailInput })
        }
      )
      const data = await res.json()
      if (data.success) {
        setNotification({ type: 'success', message: `Invoice emailed to ${emailInput}` })
        setShowEmailInput(false)
        setEmailInput('')
      } else {
        setNotification({ type: 'error', message: data.message || 'Failed to send email' })
      }
    } catch {
      setNotification({ type: 'error', message: 'Cannot connect to server' })
    } finally {
      setEmailLoading(false)
    }
  }

  // Calculate hours remaining in 72hr amendment window
  const getAmendmentWindow = () => {
    if (!invoice?.sentAt) return null
    const sent = new Date(invoice.sentAt).getTime()
    const hoursElapsed = (now - sent) / (1000 * 60 * 60)
    const hoursLeft = 72 - hoursElapsed
    if (hoursLeft <= 0) return null
    return {
      hoursLeft: Math.floor(hoursLeft),
      minutesLeft: Math.floor((hoursLeft % 1) * 60)
    }
  }

  const handleAmendment = (type: 'CREDIT_NOTE' | 'DEBIT_NOTE') => {
    // Pass original invoice data to create page via URL params
    const params = new URLSearchParams({
      amendmentType: type,
      originalInvoiceId: invoice.id,
      originalFbrNo: invoice.fbrInvoiceNo,
      prefill: JSON.stringify({
        invoiceType: type,
        invoiceDate: new Date().toISOString().split('T')[0],
        buyerNtn: invoice.buyerNtn || '',
        buyerCnic: invoice.buyerCnic || '',
        buyerName: invoice.buyerName || '',
        saleType: invoice.saleType,
        items: invoice.items
      })
    })
    router.push(`/create?${params.toString()}`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT':     return 'text-green-400 bg-green-500/10 border-green-500/30'
      case 'PENDING':  return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
      case 'FAILED':   return 'text-red-400 bg-red-500/10 border-red-500/30'
      case 'AMENDED':  return 'text-gray-400 bg-gray-500/10 border-gray-500/30'
      default:         return 'text-gray-400 bg-gray-500/10 border-gray-500/30'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'SALE':        return { label: 'Sale', color: 'text-blue-400' }
      case 'PURCHASE':    return { label: 'Purchase', color: 'text-purple-400' }
      case 'CREDIT_NOTE': return { label: 'Credit Note', color: 'text-red-400' }
      case 'DEBIT_NOTE':  return { label: 'Debit Note', color: 'text-orange-400' }
      default:            return { label: type, color: 'text-gray-400' }
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <p className="text-gray-400">Loading invoice...</p>
    </div>
  )

  if (!invoice) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <p className="text-gray-400">Invoice not found</p>
    </div>
  )

  const grandTotal = Number(invoice.totalAmount) + Number(invoice.totalSalesTax) + Number(invoice.totalFed) - Number(invoice.totalDiscount)
  const amendmentWindow = getAmendmentWindow()
  const typeInfo = getTypeLabel(invoice.invoiceType)

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <button
              onClick={() => router.push('/invoices')}
              className="text-gray-400 hover:text-white text-sm mb-2 flex items-center gap-1 transition"
            >
              ← Back to Invoices
            </button>
            <h1 className="text-3xl font-bold">Invoice Detail</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${typeInfo.color}`}>
              {typeInfo.label}
            </span>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(invoice.status)}`}>
              {invoice.status}
            </span>
          </div>
        </div>

        {/* Inline Notification (replaces alert()) */}
        {notification && (
          <div className={`px-4 py-3 rounded-lg mb-6 ${
            notification.type === 'success'
              ? 'bg-green-500/10 border border-green-500/50 text-green-400'
              : 'bg-red-500/10 border border-red-500/50 text-red-400'
          }`}>
            {notification.type === 'success' ? '✓' : '✕'} {notification.message}
          </div>
        )}

        {/* FBR Submission Info */}
        {invoice.fbrInvoiceNo && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
            <p className="text-green-400 font-semibold">✓ Submitted to FBR</p>
            <p className="text-white font-mono mt-1">FBR Invoice No: {invoice.fbrInvoiceNo}</p>
            {invoice.sentAt && (
              <p className="text-gray-400 text-xs mt-1">
                Submitted on {new Date(invoice.sentAt).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* 72-Hour Amendment Window — only on original SALE/PURCHASE invoices */}
        {(invoice.status === 'SENT' || invoice.status === 'AMENDED') && amendmentWindow && 
         (invoice.invoiceType === 'SALE' || invoice.invoiceType === 'PURCHASE') && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-5 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-yellow-400 font-semibold text-sm">
                  ⏱ Amendment Window Open
                </p>
                <p className="text-gray-300 text-sm mt-1">
                  FBR allows amendments within 72 hours of submission.
                  <span className="text-yellow-400 font-semibold ml-1">
                    {amendmentWindow.hoursLeft}h {amendmentWindow.minutesLeft}m remaining
                  </span>
                </p>
                <p className="text-gray-400 text-xs mt-2">
                  Raise a Credit Note if the original amount was too high, or a Debit Note if it was too low.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => handleAmendment('CREDIT_NOTE')}
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
              >
                Raise Credit Note
              </button>
              <button
                onClick={() => handleAmendment('DEBIT_NOTE')}
                className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
              >
                Raise Debit Note
              </button>
            </div>
          </div>
        )}

        {/* Amendment window expired notice */}
        {invoice.status === 'SENT' && !amendmentWindow && invoice.sentAt && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
            <p className="text-gray-400 text-sm">
              ⏱ Amendment window has expired (72 hours passed since submission)
            </p>
          </div>
        )}

        {/* Invoice Info */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-4 text-gray-300">Invoice Information</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Invoice ID</span>
                <span className="font-mono text-xs text-gray-300">{invoice.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Type</span>
                <span className={`font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Date</span>
                <span className="text-white">{new Date(invoice.invoiceDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Sale Type</span>
                <span className="text-white">{invoice.saleType === 'T1000017' ? 'Goods' : 'Services'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Created At</span>
                <span className="text-white">{new Date(invoice.createdAt).toLocaleString()}</span>
              </div>
              {invoice.originalInvoiceId && (
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Amends Invoice</span>
                  <button
                    onClick={() => router.push(`/invoices/${invoice.originalInvoiceId}`)}
                    className="font-mono text-xs text-blue-400 hover:text-blue-300 transition"
                  >
                    {invoice.originalInvoiceId.slice(0, 12)}...
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-4 text-gray-300">Buyer Information</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Name</span>
                <span className="text-white">{invoice.buyerName || 'Walk-in Customer'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">NTN</span>
                <span className="text-white font-mono">{invoice.buyerNtn || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">CNIC</span>
                <span className="text-white font-mono">{invoice.buyerCnic || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 mb-6">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold">Invoice Items</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="text-left px-6 py-3 text-gray-400 text-sm">Description</th>
                <th className="text-left px-6 py-3 text-gray-400 text-sm">HS Code</th>
                <th className="text-right px-6 py-3 text-gray-400 text-sm">Qty</th>
                <th className="text-right px-6 py-3 text-gray-400 text-sm">Rate</th>
                <th className="text-right px-6 py-3 text-gray-400 text-sm">Amount</th>
                <th className="text-right px-6 py-3 text-gray-400 text-sm">Sales Tax</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item: any, index: number) => (
                <tr key={index} className="border-t border-gray-800">
                  <td className="px-6 py-4 text-white">{item.description || '—'}</td>
                  <td className="px-6 py-4 font-mono text-sm text-gray-400">{item.hsCode || '—'}</td>
                  <td className="px-6 py-4 text-right text-white">{item.quantity}</td>
                  <td className="px-6 py-4 text-right text-white">PKR {Number(item.rate).toFixed(2)}</td>
                  <td className="px-6 py-4 text-right text-white">PKR {Number(item.totalAmount).toFixed(2)}</td>
                  <td className="px-6 py-4 text-right text-green-400">PKR {Number(item.salesTax).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 mb-6">
          <div className="flex flex-col items-end space-y-2">
            <div className="flex justify-between w-64">
              <span className="text-gray-400">Subtotal</span>
              <span className="text-white">PKR {Number(invoice.totalAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between w-64">
              <span className="text-gray-400">Sales Tax</span>
              <span className="text-green-400">PKR {Number(invoice.totalSalesTax).toFixed(2)}</span>
            </div>
            {Number(invoice.totalFed) > 0 && (
              <div className="flex justify-between w-64">
                <span className="text-gray-400">FED</span>
                <span className="text-blue-400">PKR {Number(invoice.totalFed).toFixed(2)}</span>
              </div>
            )}
            {Number(invoice.totalDiscount) > 0 && (
              <div className="flex justify-between w-64">
                <span className="text-gray-400">Discount</span>
                <span className="text-red-400">- PKR {Number(invoice.totalDiscount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between w-64 border-t border-gray-700 pt-2">
              <span className="text-white font-bold">Grand Total</span>
              <span className="text-white font-bold text-lg">PKR {grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4">
          {(invoice.status === 'PENDING' || invoice.status === 'FAILED') && (
            <button
              onClick={handleSubmitToFBR}
              disabled={submitLoading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 px-6 py-3 rounded-lg font-semibold transition"
            >
              {submitLoading ? 'Submitting...' : '🚀 Submit to FBR'}
            </button>
          )}

          <button
            onClick={handleDownloadPDF}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition"
          >
            📄 Download PDF
          </button>

          {/* Send Email — only shown if submitted to FBR */}
          {invoice.fbrInvoiceNo && (
            <div className="flex flex-col gap-2">
              {!showEmailInput ? (
                <button
                  onClick={() => setShowEmailInput(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg font-semibold transition"
                >
                  📧 Send to Buyer
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="buyer@example.com"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendEmail()}
                    className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition w-56"
                    autoFocus
                  />
                  <button
                    onClick={handleSendEmail}
                    disabled={emailLoading}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 px-4 py-3 rounded-lg font-semibold text-sm transition"
                  >
                    {emailLoading ? 'Sending...' : 'Send'}
                  </button>
                  <button
                    onClick={() => { setShowEmailInput(false); setEmailInput('') }}
                    className="bg-gray-800 hover:bg-gray-700 px-4 py-3 rounded-lg text-sm transition"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => router.push('/create')}
            className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-semibold transition"
          >
            ➕ Create New Invoice
          </button>

          <button
            onClick={() => router.push('/invoices')}
            className="bg-gray-800 hover:bg-gray-700 px-6 py-3 rounded-lg font-semibold transition"
          >
            ← Back to List
          </button>
        </div>
      </div>
    </div>
  )
}