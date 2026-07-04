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
    const urlParams = new URLSearchParams({
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
    router.push(`/create?${urlParams.toString()}`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT':     return 'text-success-text bg-success-bg border-success-border'
      case 'PENDING':  return 'text-warning-text bg-warning-bg border-warning-border'
      case 'FAILED':   return 'text-error-text bg-error-bg border-error-border'
      case 'AMENDED':  return 'text-muted bg-border-light border-border'
      default:         return 'text-muted bg-border-light border-border'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'SALE':        return { label: 'Sale', color: 'text-link' }
      case 'PURCHASE':    return { label: 'Purchase', color: 'text-muted-dark' }
      case 'CREDIT_NOTE': return { label: 'Credit Note', color: 'text-error-text' }
      case 'DEBIT_NOTE':  return { label: 'Debit Note', color: 'text-warning-text' }
      default:            return { label: type, color: 'text-muted' }
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-background text-heading flex items-center justify-center">
      <p className="text-muted">Loading invoice...</p>
    </div>
  )

  if (!invoice) return (
    <div className="min-h-screen bg-background text-heading flex items-center justify-center">
      <p className="text-muted">Invoice not found</p>
    </div>
  )

  const isCreditNote = invoice.invoiceType === 'CREDIT_NOTE'
  const isAmendmentType = invoice.invoiceType === 'CREDIT_NOTE' || invoice.invoiceType === 'DEBIT_NOTE'

  const totalExtraTax   = invoice.items?.reduce((sum: number, item: any) => sum + Number(item.extraTax || 0), 0) || 0
  const totalFurtherTax = invoice.items?.reduce((sum: number, item: any) => sum + Number(item.furtherTax || 0), 0) || 0
  const totalRetail     = invoice.items?.reduce((sum: number, item: any) => sum + Number(item.fixedNotifiedValue || 0), 0) || 0
  const totalStWht      = invoice.items?.reduce((sum: number, item: any) => sum + Number(item.stWithheld || 0), 0) || 0

  const grandTotal = Number(invoice.totalAmount) + Number(invoice.totalSalesTax) + Number(invoice.totalFed) - Number(invoice.totalDiscount)
  const amendmentWindow = getAmendmentWindow()
  const typeInfo = getTypeLabel(invoice.invoiceType)

  return (
    <div className="min-h-screen bg-background text-heading p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <button
              onClick={() => router.push('/invoices')}
              className="text-muted hover:text-heading text-sm mb-2 flex items-center gap-1 transition"
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
              ? 'bg-success-bg border border-success-border text-success-text'
              : 'bg-error-bg border border-error-border text-error-text'
          }`}>
            {notification.message}
          </div>
        )}

        {/* Amendment reason (Credit/Debit Notes) */}
        {isAmendmentType && invoice.amendmentReason && (
          <div className="bg-surface-alt border border-border rounded-lg p-4 mb-6">
            <p className="text-muted text-sm">
              <span className="font-semibold text-heading">Amendment Reason: </span>
              {invoice.amendmentReason}
            </p>
          </div>
        )}

        {/* FBR Submission Info */}
        {invoice.fbrInvoiceNo && (
          <div className="bg-success-bg border border-success-border rounded-lg p-4 mb-6">
            <p className="text-success-text font-semibold">Submitted to FBR</p>
            <p className="text-heading font-mono mt-1">FBR Invoice No: {invoice.fbrInvoiceNo}</p>
            {invoice.sentAt && (
              <p className="text-muted text-xs mt-1">
                Submitted on {new Date(invoice.sentAt).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* 72-Hour Amendment Window — only on original SALE/PURCHASE invoices */}
        {(invoice.status === 'SENT' || invoice.status === 'AMENDED') && amendmentWindow &&
         (invoice.invoiceType === 'SALE' || invoice.invoiceType === 'PURCHASE') && (
          <div className="bg-warning-bg border border-warning-border rounded-lg p-5 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-warning-text font-semibold text-sm">
                  Amendment Window Open
                </p>
                <p className="text-body text-sm mt-1">
                  FBR allows amendments within 72 hours of submission.
                  <span className="text-warning-text font-semibold ml-1">
                    {amendmentWindow.hoursLeft}h {amendmentWindow.minutesLeft}m remaining
                  </span>
                </p>
                <p className="text-muted text-xs mt-2">
                  Raise a Credit Note if the original amount was too high, or a Debit Note if it was too low.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => handleAmendment('CREDIT_NOTE')}
                className="bg-error-bg hover:opacity-80 border border-error-border text-error-text text-sm font-semibold px-5 py-2 rounded-lg transition"
              >
                Raise Credit Note
              </button>
              <button
                onClick={() => handleAmendment('DEBIT_NOTE')}
                className="bg-warning-bg hover:opacity-80 border border-warning-border text-warning-text text-sm font-semibold px-5 py-2 rounded-lg transition"
              >
                Raise Debit Note
              </button>
            </div>
          </div>
        )}

        {/* Amendment window expired notice */}
        {invoice.status === 'SENT' && !amendmentWindow && invoice.sentAt && (
          <div className="bg-surface-alt border border-border rounded-lg p-4 mb-6">
            <p className="text-muted text-sm">
              Amendment window has expired (72 hours passed since submission)
            </p>
          </div>
        )}

        {/* Seller / Buyer / Invoice Summary — mirrors the PDF's three-column block */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="bg-surface rounded-lg p-6 border border-border">
            <h2 className="text-lg font-semibold mb-4 text-body">Seller Information</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted text-sm">Business Name</span>
                <span className="text-heading text-right">{invoice.business?.businessName || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted text-sm">Registration No.</span>
                <span className="text-heading font-mono">{invoice.business?.ntn || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted text-sm">Province</span>
                <span className="text-heading">{invoice.business?.province || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-lg p-6 border border-border">
            <h2 className="text-lg font-semibold mb-4 text-body">Buyer Information</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted text-sm">Business Name</span>
                <span className="text-heading text-right">{invoice.buyerName || 'Walk-in Customer'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted text-sm">Registration No.</span>
                <span className="text-heading font-mono">{invoice.buyerNtn || invoice.buyerCnic || 'N/A'}</span>
              </div>
              {invoice.originalInvoiceId && (
                <div className="flex justify-between">
                  <span className="text-muted text-sm">Amends Invoice</span>
                  <button
                    onClick={() => router.push(`/invoices/${invoice.originalInvoiceId}`)}
                    className="font-mono text-xs text-link hover:opacity-70 transition"
                  >
                    {invoice.originalInvoiceId.slice(0, 12)}...
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-surface rounded-lg p-6 border border-border">
            <h2 className="text-lg font-semibold mb-4 text-body">Invoice Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted text-sm">FBR Invoice No.</span>
                <span className="text-heading font-mono text-xs text-right">{invoice.fbrInvoiceNo || 'Not yet submitted'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted text-sm">Invoice Date</span>
                <span className="text-heading">{new Date(invoice.invoiceDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted text-sm">Invoice Type</span>
                <span className={`font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted text-sm">Status</span>
                <span className="text-heading">{invoice.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted text-sm">Sale Type</span>
                <span className="text-heading">{invoice.saleType === 'T1000017' ? 'Goods' : 'Services'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted text-sm">Invoice ID</span>
                <span className="font-mono text-xs text-body">{invoice.id.slice(0, 12)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted text-sm">Created At</span>
                <span className="text-heading text-xs">{new Date(invoice.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table — expanded to match every column in the PDF */}
        <div className="bg-surface rounded-lg border border-border mb-6 overflow-x-auto">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold">Invoice Items</h2>
          </div>
          <table className="w-full min-w-[1400px] text-sm">
            <thead className="bg-border-light">
              <tr>
                <th className="text-left px-3 py-3 text-muted text-xs">Sr. No.</th>
                <th className="text-left px-3 py-3 text-muted text-xs">HS Code</th>
                <th className="text-left px-3 py-3 text-muted text-xs">HS Code Description</th>
                <th className="text-left px-3 py-3 text-muted text-xs">Product Description</th>
                <th className="text-left px-3 py-3 text-muted text-xs">Sales Type</th>
                <th className="text-right px-3 py-3 text-muted text-xs">Quantity</th>
                <th className="text-left px-3 py-3 text-muted text-xs">UoM</th>
                <th className="text-right px-3 py-3 text-muted text-xs">Rate</th>
                <th className="text-right px-3 py-3 text-muted text-xs">Sales Value</th>
                <th className="text-right px-3 py-3 text-muted text-xs">Retail Price</th>
                <th className="text-right px-3 py-3 text-muted text-xs">Sales Tax</th>
                <th className="text-right px-3 py-3 text-muted text-xs">Extra Tax</th>
                <th className="text-right px-3 py-3 text-muted text-xs">Further Tax</th>
                <th className="text-right px-3 py-3 text-muted text-xs">FED</th>
                <th className="text-right px-3 py-3 text-muted text-xs">ST WHT</th>
                <th className="text-right px-3 py-3 text-muted text-xs">Discount</th>
                <th className="text-left px-3 py-3 text-muted text-xs">SRO / Schedule No.</th>
                <th className="text-left px-3 py-3 text-muted text-xs">SRO Item Sr. No.</th>
                <th className="text-left px-3 py-3 text-muted text-xs">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item: any, index: number) => {
                const qty        = isCreditNote ? Math.abs(Number(item.quantity))    : Number(item.quantity)
                const salesValue = isCreditNote ? Math.abs(Number(item.totalAmount)) : Number(item.totalAmount)
                const salesTax   = isCreditNote ? Math.abs(Number(item.salesTax))    : Number(item.salesTax)

                return (
                  <tr key={index} className="border-t border-border">
                    <td className="px-3 py-3 text-heading">{index + 1}</td>
                    <td className="px-3 py-3 font-mono text-xs text-muted">{item.hsCode || '—'}</td>
                    <td className="px-3 py-3 text-heading">{item.hsCodeDescription || '—'}</td>
                    <td className="px-3 py-3 text-heading">{item.description || '—'}</td>
                    <td className="px-3 py-3 text-heading">{invoice.saleType || '—'}</td>
                    <td className="px-3 py-3 text-right text-heading">{qty}</td>
                    <td className="px-3 py-3 text-heading">{item.uom || '—'}</td>
                    <td className="px-3 py-3 text-right text-heading">{Number(item.rate).toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-heading">{salesValue.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-heading">{Number(item.fixedNotifiedValue || 0).toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-success-text">{salesTax.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-heading">{Number(item.extraTax || 0).toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-heading">{Number(item.furtherTax || 0).toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-link">{Number(item.fed || 0).toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-heading">{Number(item.stWithheld || 0).toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-error-text">{Number(item.discount || 0).toFixed(2)}</td>
                    <td className="px-3 py-3 text-heading">{item.sroSchedule || '—'}</td>
                    <td className="px-3 py-3 text-heading">{item.itemSNo || '—'}</td>
                    <td className="px-3 py-3 text-heading">{invoice.status || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="bg-surface rounded-lg p-6 border border-border mb-6">
          <div className="grid grid-cols-4 md:grid-cols-8 gap-4 text-center mb-6">
            <div>
              <p className="text-muted text-sm">Total Amount</p>
              <p className="text-xl font-bold text-heading">PKR {Number(invoice.totalAmount).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted text-sm">Sales Tax</p>
              <p className="text-xl font-bold text-heading">PKR {Number(invoice.totalSalesTax).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted text-sm">Extra Tax</p>
              <p className="text-xl font-bold text-heading">PKR {totalExtraTax.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted text-sm">Further Tax</p>
              <p className="text-xl font-bold text-heading">PKR {totalFurtherTax.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted text-sm">FED</p>
              <p className="text-xl font-bold text-heading">PKR {Number(invoice.totalFed).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted text-sm">Retail Price</p>
              <p className="text-xl font-bold text-heading">PKR {totalRetail.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted text-sm">ST Withheld</p>
              <p className="text-xl font-bold text-heading">PKR {totalStWht.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted text-sm">Discount</p>
              <p className="text-xl font-bold text-error-text">- PKR {Number(invoice.totalDiscount).toFixed(2)}</p>
            </div>
          </div>
          <div className="flex justify-end border-t border-border pt-4">
            <div className="flex justify-between w-64">
              <span className="text-heading font-bold">Grand Total</span>
              <span className="text-heading font-bold text-lg">PKR {grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4">
          {(invoice.status === 'PENDING' || invoice.status === 'FAILED') && (
            <button
              onClick={handleSubmitToFBR}
              disabled={submitLoading}
              className="bg-btn-dark hover:bg-btn-dark-hover disabled:bg-border-light disabled:text-muted text-btn-dark-text px-6 py-3 rounded-lg font-semibold transition"
            >
              {submitLoading ? 'Submitting...' : 'Submit to FBR'}
            </button>
          )}

          <button
            onClick={handleDownloadPDF}
            className="bg-surface border border-border hover:border-heading text-heading px-6 py-3 rounded-lg font-semibold transition"
          >
            Download PDF
          </button>

          {/* Send Email — only shown if submitted to FBR */}
          {invoice.fbrInvoiceNo && (
            <div className="flex flex-col gap-2">
              {!showEmailInput ? (
                <button
                  onClick={() => setShowEmailInput(true)}
                  className="bg-surface border border-border hover:border-heading text-heading px-6 py-3 rounded-lg font-semibold transition"
                >
                  Send to Buyer
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="buyer@example.com"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendEmail()}
                    className="bg-surface border border-border text-heading rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent transition w-56"
                    autoFocus
                  />
                  <button
                    onClick={handleSendEmail}
                    disabled={emailLoading}
                    className="bg-btn-dark hover:bg-btn-dark-hover disabled:bg-border-light disabled:text-muted text-btn-dark-text px-4 py-3 rounded-lg font-semibold text-sm transition"
                  >
                    {emailLoading ? 'Sending...' : 'Send'}
                  </button>
                  <button
                    onClick={() => { setShowEmailInput(false); setEmailInput('') }}
                    className="bg-surface border border-border hover:border-heading text-heading px-4 py-3 rounded-lg text-sm transition"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => router.push('/create')}
            className="bg-surface border border-border hover:border-heading text-heading px-6 py-3 rounded-lg font-semibold transition"
          >
            Create New Invoice
          </button>

          <button
            onClick={() => router.push('/invoices')}
            className="bg-surface border border-border hover:border-heading text-heading px-6 py-3 rounded-lg font-semibold transition"
          >
            ← Back to List
          </button>
        </div>
      </div>
    </div>
  )
}