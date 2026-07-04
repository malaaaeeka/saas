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
        <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
          <div>
            <button
              onClick={() => router.push('/invoices')}
              className="text-muted hover:text-heading text-sm mb-3 inline-flex items-center gap-1 transition"
            >
              ← Back to Invoices
            </button>
            <h1 className="text-3xl font-bold tracking-tight">Invoice Detail</h1>
            <p className="text-muted text-sm font-mono mt-1">{invoice.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium px-3 py-1 rounded-full bg-surface-alt border border-border ${typeInfo.color}`}>
              {typeInfo.label}
            </span>
            <span className={`px-4 py-1.5 rounded-full text-sm font-semibold border ${getStatusColor(invoice.status)}`}>
              {invoice.status}
            </span>
          </div>
        </div>

        {/* Inline Notification (replaces alert()) */}
        {notification && (
          <div className={`px-4 py-3 rounded-xl mb-6 ${
            notification.type === 'success'
              ? 'bg-success-bg border border-success-border text-success-text'
              : 'bg-error-bg border border-error-border text-error-text'
          }`}>
            {notification.message}
          </div>
        )}

        {/* Amendment reason (Credit/Debit Notes) */}
        {isAmendmentType && invoice.amendmentReason && (
          <div className="bg-surface-alt border border-border rounded-xl p-4 mb-6">
            <p className="text-muted text-sm">
              <span className="font-semibold text-heading">Amendment Reason: </span>
              {invoice.amendmentReason}
            </p>
          </div>
        )}

        {/* FBR Submission Info */}
        {invoice.fbrInvoiceNo && (
          <div className="bg-surface border border-border border-l-4 border-l-success-border rounded-xl p-4 mb-6 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-success-text" />
              <p className="text-heading font-semibold text-sm">Submitted to FBR</p>
            </div>
            <p className="text-heading font-mono text-sm mt-2">FBR Invoice No: {invoice.fbrInvoiceNo}</p>
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
          <div className="bg-surface border border-border border-l-4 border-l-warning-border rounded-xl p-5 mb-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning-text" />
                  <p className="text-heading font-semibold text-sm">
                    Amendment Window Open
                  </p>
                </div>
                <p className="text-body text-sm mt-2">
                  FBR allows amendments within 72 hours of submission —
                  <span className="text-heading font-semibold ml-1">
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
                className="bg-surface hover:bg-surface-alt border border-border text-heading text-sm font-semibold px-5 py-2 rounded-lg transition"
              >
                Raise Credit Note
              </button>
              <button
                onClick={() => handleAmendment('DEBIT_NOTE')}
                className="bg-surface hover:bg-surface-alt border border-border text-heading text-sm font-semibold px-5 py-2 rounded-lg transition"
              >
                Raise Debit Note
              </button>
            </div>
          </div>
        )}

        {/* Amendment window expired notice */}
        {invoice.status === 'SENT' && !amendmentWindow && invoice.sentAt && (
          <div className="bg-surface border border-border rounded-xl p-4 mb-6">
            <p className="text-muted text-sm">
              Amendment window has expired (72 hours passed since submission)
            </p>
          </div>
        )}

        {/* Seller / Buyer / Invoice Summary — mirrors the PDF's three-column block */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
            <h2 className="text-sm font-semibold px-6 py-4 border-b border-border text-body">Seller Information</h2>
            <div className="space-y-3 p-6">
              <div className="flex justify-between gap-4">
                <span className="text-muted text-sm">Business Name</span>
                <span className="text-heading text-right">{invoice.business?.businessName || 'N/A'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted text-sm">Registration No.</span>
                <span className="text-heading font-mono text-sm">{invoice.business?.ntn || 'N/A'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted text-sm">Province</span>
                <span className="text-heading">{invoice.business?.province || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
            <h2 className="text-sm font-semibold px-6 py-4 border-b border-border text-body">Buyer Information</h2>
            <div className="space-y-3 p-6">
              <div className="flex justify-between gap-4">
                <span className="text-muted text-sm">Business Name</span>
                <span className="text-heading text-right">{invoice.buyerName || 'Walk-in Customer'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted text-sm">Registration No.</span>
                <span className="text-heading font-mono text-sm">{invoice.buyerNtn || invoice.buyerCnic || 'N/A'}</span>
              </div>
              {invoice.originalInvoiceId && (
                <div className="flex justify-between gap-4">
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

          <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
            <h2 className="text-sm font-semibold px-6 py-4 border-b border-border text-body">Invoice Summary</h2>
            <div className="space-y-3 p-6">
              <div className="flex justify-between gap-4">
                <span className="text-muted text-sm">FBR Invoice No.</span>
                <span className="text-heading font-mono text-xs text-right">{invoice.fbrInvoiceNo || 'Not yet submitted'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted text-sm">Invoice Date</span>
                <span className="text-heading">{new Date(invoice.invoiceDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted text-sm">Invoice Type</span>
                <span className={`font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted text-sm">Status</span>
                <span className="text-heading">{invoice.status}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted text-sm">Sale Type</span>
                <span className="text-heading">{invoice.saleType === 'T1000017' ? 'Goods' : 'Services'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted text-sm">Created At</span>
                <span className="text-heading text-xs">{new Date(invoice.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table — expanded to match every column in the PDF */}
        <div className="bg-surface rounded-xl border border-border shadow-sm mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold">Invoice Items</h2>
            <span className="text-xs text-muted">{invoice.items?.length || 0} line item{invoice.items?.length === 1 ? '' : 's'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px] text-sm border-collapse">
              <thead>
                <tr className="bg-surface-alt border-b border-border">
                  <th className="text-left px-4 py-3 text-muted text-[11px] font-semibold uppercase tracking-wide">Sr.</th>
                  <th className="text-left px-4 py-3 text-muted text-[11px] font-semibold uppercase tracking-wide">HS Code</th>
                  <th className="text-left px-4 py-3 text-muted text-[11px] font-semibold uppercase tracking-wide min-w-[220px]">HS Code Description</th>
                  <th className="text-left px-4 py-3 text-muted text-[11px] font-semibold uppercase tracking-wide min-w-[160px]">Product Description</th>
                  <th className="text-left px-4 py-3 text-muted text-[11px] font-semibold uppercase tracking-wide">Sales Type</th>
                  <th className="text-right px-4 py-3 text-muted text-[11px] font-semibold uppercase tracking-wide">Qty</th>
                  <th className="text-left px-4 py-3 text-muted text-[11px] font-semibold uppercase tracking-wide">UoM</th>
                  <th className="text-right px-4 py-3 text-muted text-[11px] font-semibold uppercase tracking-wide">Rate</th>
                  <th className="text-right px-4 py-3 text-muted text-[11px] font-semibold uppercase tracking-wide">Sales Value</th>
                  <th className="text-right px-4 py-3 text-muted text-[11px] font-semibold uppercase tracking-wide">Retail Price</th>
                  <th className="text-right px-4 py-3 text-muted text-[11px] font-semibold uppercase tracking-wide">Sales Tax</th>
                  <th className="text-right px-4 py-3 text-muted text-[11px] font-semibold uppercase tracking-wide">Extra Tax</th>
                  <th className="text-right px-4 py-3 text-muted text-[11px] font-semibold uppercase tracking-wide">Further Tax</th>
                  <th className="text-right px-4 py-3 text-muted text-[11px] font-semibold uppercase tracking-wide">FED</th>
                  <th className="text-right px-4 py-3 text-muted text-[11px] font-semibold uppercase tracking-wide">ST WHT</th>
                  <th className="text-right px-4 py-3 text-muted text-[11px] font-semibold uppercase tracking-wide">Discount</th>
                  <th className="text-left px-4 py-3 text-muted text-[11px] font-semibold uppercase tracking-wide">SRO / Schedule</th>
                  <th className="text-left px-4 py-3 text-muted text-[11px] font-semibold uppercase tracking-wide">SRO Item Sr.</th>
                  <th className="text-left px-4 py-3 text-muted text-[11px] font-semibold uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item: any, index: number) => {
                  const qty        = isCreditNote ? Math.abs(Number(item.quantity))    : Number(item.quantity)
                  const salesValue = isCreditNote ? Math.abs(Number(item.totalAmount)) : Number(item.totalAmount)
                  const salesTax   = isCreditNote ? Math.abs(Number(item.salesTax))    : Number(item.salesTax)

                  return (
                    <tr key={index} className={`border-b border-border last:border-b-0 ${index % 2 === 1 ? 'bg-surface-alt/40' : ''}`}>
                      <td className="px-4 py-3 text-muted align-top">{index + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted align-top whitespace-nowrap">{item.hsCode || '—'}</td>
                      <td className="px-4 py-3 text-heading align-top">{item.hsCodeDescription || '—'}</td>
                      <td className="px-4 py-3 text-heading align-top">{item.description || '—'}</td>
                      <td className="px-4 py-3 text-heading align-top">{invoice.saleType || '—'}</td>
                      <td className="px-4 py-3 text-right text-heading align-top tabular-nums whitespace-nowrap">{qty}</td>
                      <td className="px-4 py-3 text-heading align-top whitespace-nowrap">{item.uom || '—'}</td>
                      <td className="px-4 py-3 text-right text-heading align-top tabular-nums whitespace-nowrap">{Number(item.rate).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-heading align-top tabular-nums whitespace-nowrap">{salesValue.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-heading align-top tabular-nums whitespace-nowrap">{Number(item.fixedNotifiedValue || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-success-text align-top tabular-nums whitespace-nowrap">{salesTax.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-heading align-top tabular-nums whitespace-nowrap">{Number(item.extraTax || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-heading align-top tabular-nums whitespace-nowrap">{Number(item.furtherTax || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-link align-top tabular-nums whitespace-nowrap">{Number(item.fed || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-heading align-top tabular-nums whitespace-nowrap">{Number(item.stWithheld || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-error-text align-top tabular-nums whitespace-nowrap">{Number(item.discount || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-heading align-top whitespace-nowrap">{item.sroSchedule || '—'}</td>
                      <td className="px-4 py-3 text-heading align-top whitespace-nowrap">{item.itemSNo || '—'}</td>
                      <td className="px-4 py-3 text-heading align-top whitespace-nowrap">{invoice.status || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="bg-surface rounded-xl border border-border shadow-sm mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold">Totals</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-x-4 gap-y-5">
              <div>
                <p className="text-muted text-xs uppercase tracking-wide mb-1">Total Amount</p>
                <p className="text-lg font-semibold text-heading tabular-nums">PKR {Number(invoice.totalAmount).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted text-xs uppercase tracking-wide mb-1">Sales Tax</p>
                <p className="text-lg font-semibold text-heading tabular-nums">PKR {Number(invoice.totalSalesTax).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted text-xs uppercase tracking-wide mb-1">Extra Tax</p>
                <p className="text-lg font-semibold text-heading tabular-nums">PKR {totalExtraTax.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted text-xs uppercase tracking-wide mb-1">Further Tax</p>
                <p className="text-lg font-semibold text-heading tabular-nums">PKR {totalFurtherTax.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted text-xs uppercase tracking-wide mb-1">FED</p>
                <p className="text-lg font-semibold text-heading tabular-nums">PKR {Number(invoice.totalFed).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted text-xs uppercase tracking-wide mb-1">Retail Price</p>
                <p className="text-lg font-semibold text-heading tabular-nums">PKR {totalRetail.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted text-xs uppercase tracking-wide mb-1">ST Withheld</p>
                <p className="text-lg font-semibold text-heading tabular-nums">PKR {totalStWht.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted text-xs uppercase tracking-wide mb-1">Discount</p>
                <p className="text-lg font-semibold text-error-text tabular-nums">- PKR {Number(invoice.totalDiscount).toFixed(2)}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between px-6 py-4 bg-surface-alt border-t border-border">
            <span className="text-heading font-semibold">Grand Total</span>
            <span className="text-heading font-bold text-xl tabular-nums">PKR {grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-start gap-3">
          {(invoice.status === 'PENDING' || invoice.status === 'FAILED') && (
            <button
              onClick={handleSubmitToFBR}
              disabled={submitLoading}
              className="bg-btn-dark hover:bg-btn-dark-hover disabled:bg-border-light disabled:text-muted text-btn-dark-text px-6 py-3 rounded-lg font-semibold transition shadow-sm"
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
        </div>
      </div>
    </div>
  )
}