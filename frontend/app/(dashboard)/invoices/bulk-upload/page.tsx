'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { groupRowsIntoInvoices, InvoiceGroup } from '@/lib/invoiceExcel'

export default function BulkUploadPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [groups, setGroups] = useState<InvoiceGroup[]>([])
  const [batchId, setBatchId] = useState<string | null>(null)
  const [status, setStatus] = useState<any>(null)
  const [error, setError] = useState('')
const [success, setSuccess] = useState('')
const [showConfirm, setShowConfirm] = useState(false)

  const handleFile = async (e: any) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setSuccess('')
    const buf = await file.arrayBuffer()
    const workbook = XLSX.read(buf, { type: 'array', sheets: 0 })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const grid: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
    const rawHeaders = grid[0].map((h: any) => String(h || '').trim())
    const dataRows = grid.slice(1).filter(r => r.some(c => String(c).trim() !== ''))
    const parsed = groupRowsIntoInvoices(dataRows, rawHeaders)
    if (parsed.length === 0) {
      setError('No invoices could be grouped — check the Document Number column is filled in.')
      return
    }
    setGroups(parsed)
    setSuccess(`Loaded ${parsed.length} invoice(s) from ${file.name}`)
  }

  const validCount = groups.filter(g => g.valid).length
  const skippedCount = groups.length - validCount

  const requestSubmit = () => {
    if (validCount === 0) { setError('No valid invoices to submit'); return }
    setShowConfirm(true)
  }

  const confirmSubmit = async () => {
    setShowConfirm(false)
    const valid = groups.filter(g => g.valid)
    setError('')
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invoices/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ invoices: valid.map(g => g.payload) }),
      })
      const data = await res.json()
      if (data.success) setBatchId(data.data.batchId)
      else setError(data.message || 'Failed to start batch')
    } catch {
      setError('Network error — could not reach the server. Please try again.')
    }
  }

  useEffect(() => {
    if (!batchId) return
    const iv = setInterval(async () => {
      const token = localStorage.getItem('token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invoices/bulk/${batchId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setStatus(data.data)
      if (data.data.status === 'DONE') clearInterval(iv)
    }, 2000)
    return () => clearInterval(iv)
  }, [batchId])

  return (
    <div className="min-h-screen bg-background text-heading p-8">
      <div className="max-w-6xl mx-auto">

        <div className="mb-8">
          <button onClick={() => router.back()} className="text-muted hover:text-heading text-sm mb-2 flex items-center gap-1 transition">
            ← Back
          </button>
          <h1 className="text-3xl font-bold mb-2">Bulk Upload Invoices</h1>
          <p className="text-muted">Upload an Excel file with multiple invoices, grouped by Document Number</p>
        </div>

        {success && (
          <div className="bg-surface border border-border border-l-4 border-l-success-border rounded-xl px-4 py-3 mb-6 shadow-sm flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-success-text" />
            <p className="text-heading text-sm font-medium">{success}</p>
          </div>
        )}

        {error && (
          <div className="bg-surface border border-border border-l-4 border-l-red-500 rounded-xl px-4 py-3 mb-6 shadow-sm flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 flex-shrink-0" />
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {!batchId && (
          <>
            <div className="mb-6">
              <input type="file" accept=".xlsx,.xls,.xlsm" ref={fileInputRef} onChange={handleFile} className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full group bg-surface border border-border rounded-xl px-6 py-5 shadow-sm transition-colors flex items-center gap-4 text-left"
              >
                <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-border-light group-hover:bg-heading/5 flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 text-muted group-hover:text-heading transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-heading font-semibold text-sm">Upload Excel with multiple invoices</p>
                  <p className="text-muted text-xs mt-0.5">Rows sharing the same Document Number are grouped into one invoice</p>
                </div>
                <span className="flex-shrink-0 text-xs font-medium text-muted group-hover:text-heading transition-colors border border-border rounded-lg px-3 py-1.5">
                  Browse
                </span>
              </button>
            </div>

            {groups.length > 0 && (
              <div className="bg-surface rounded-xl p-6 border border-border shadow-sm mb-6">
                <h2 className="text-lg font-semibold mb-2">Preview — {groups.length} Invoice(s)</h2>
                <div className="flex items-center gap-4 mb-4 text-sm">
                  <span className="text-success-text font-medium">{validCount} ready to submit</span>
                  {skippedCount > 0 && (
                    <span className="text-red-600 font-medium">
                      {skippedCount} skipped due to errors — fix and re-upload to include them
                    </span>
                  )}
                </div>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-border-light text-left">
                      <tr>
                        <th className="p-3 font-medium text-muted">Document #</th>
                        <th className="p-3 font-medium text-muted">Buyer</th>
                        <th className="p-3 font-medium text-muted">Items</th>
                        <th className="p-3 font-medium text-muted">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map(g => (
                        <tr key={g.documentNumber} className="border-t border-border">
                          <td className="p-3 font-mono text-xs">{g.documentNumber}</td>
                          <td className="p-3">{g.payload.buyerName || '—'}</td>
                          <td className="p-3">{g.payload.items.length}</td>
                          <td className="p-3">
                            {g.valid
                              ? <span className="text-success-text font-medium flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-success-text" />Ready</span>
                              : <span className="text-red-600 font-medium flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-600" />{g.errors.join(', ')}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-4 justify-start mt-6">
                  <button onClick={requestSubmit}
                    className="bg-btn-dark hover:bg-btn-dark-hover text-btn-dark-text font-semibold py-3 px-8 rounded-lg transition">
                    Submit {validCount} Invoice(s)
                  </button>
                  <button type="button" onClick={() => router.push('/invoices')}
                    className="bg-surface border border-border hover:border-heading text-heading font-semibold py-3 px-8 rounded-lg transition">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {batchId && status && (
          <div className="bg-surface rounded-xl p-6 border border-border shadow-sm">
            <h2 className="text-lg font-semibold mb-4">
              Processing: {status.completed} / {status.total} {status.status === 'DONE' ? '— Done' : '...'}
            </h2>
            <div className="border border-border rounded-lg overflow-hidden">
              {status.results?.map((r: any) => (
                <div key={r.documentNumber} className="flex justify-between border-t border-border first:border-t-0 py-2 px-3 text-sm">
                  <span className="font-mono text-xs">{r.documentNumber}</span>
                  <span className={r.status === 'SUCCESS' ? 'text-success-text font-medium' : 'text-red-600 font-medium'}>
                    {r.status === 'SUCCESS'
  ? <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-success-text" />{r.fbrInvoiceNo}</span>
  : <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-600" />{r.error}</span>}
                  </span>
                </div>
              ))}
            </div>
            {status.status === 'DONE' && (
              <button type="button" onClick={() => router.push('/invoices')}
                className="bg-btn-dark hover:bg-btn-dark-hover text-btn-dark-text font-semibold py-3 px-8 rounded-lg transition mt-6">
                Go to Invoices
              </button>
            )}
          </div>
        )}

        {showConfirm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-surface rounded-xl p-6 border border-border shadow-lg max-w-md w-full">
              <h3 className="text-lg font-semibold mb-2">Confirm submission</h3>
              <p className="text-muted text-sm mb-6">
                {skippedCount > 0
                  ? `${skippedCount} invoice(s) will be skipped due to validation errors. Submit the remaining ${validCount}?`
                  : `Submit ${validCount} invoice(s) for FBR processing?`}
              </p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowConfirm(false)}
                  className="bg-surface border border-border hover:border-heading text-heading font-medium py-2 px-5 rounded-lg transition">
                  Cancel
                </button>
                <button onClick={confirmSubmit}
                  className="bg-btn-dark hover:bg-btn-dark-hover text-btn-dark-text font-medium py-2 px-5 rounded-lg transition">
                  Confirm Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}