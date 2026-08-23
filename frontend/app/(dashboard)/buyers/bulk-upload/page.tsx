'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { parseBuyerRows, BuyerRow } from '@/lib/buyerExcel'

export default function BulkUploadBuyersPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<BuyerRow[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [results, setResults] = useState<any[] | null>(null)

  const MAX_FILE_SIZE_MB = 10
  const MAX_ROWS = 5000
  const CHUNK_SIZE = 200

  const handleFile = async (e: any) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(''); setSuccess(''); setRows([]); setResults(null)

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max allowed is ${MAX_FILE_SIZE_MB}MB.`)
      e.target.value = ''
      return
    }
    try {
      const buf = await file.arrayBuffer()
      const workbook = XLSX.read(buf, { type: 'array', sheets: 0 })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      if (!sheet) { setError('This file has no readable sheet.'); return }
      const grid: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
      if (grid.length < 2) { setError('This file has no data rows below the header.'); return }

      const rawHeaders = grid[0].map((h: any) => String(h || '').trim())
      const dataRows = grid.slice(1).filter(r => r.some(c => String(c).trim() !== ''))
      if (dataRows.length > MAX_ROWS) {
        setError(`This file has ${dataRows.length} rows, exceeds the ${MAX_ROWS}-row limit.`)
        return
      }
      const parsed = parseBuyerRows(dataRows, rawHeaders)
      setRows(parsed)
      setSuccess(`Loaded ${parsed.length} buyer(s) from ${file.name}`)
    } catch {
      setError('Could not read this file — it may be corrupted or not a valid Excel file.')
    } finally {
      e.target.value = ''
    }
  }

  const validCount = rows.filter(r => r.valid).length
  const skippedCount = rows.length - validCount

  const requestSubmit = () => {
    if (validCount === 0) { setError('No valid buyers to submit'); return }
    setShowConfirm(true)
  }

  const confirmSubmit = async () => {
    setShowConfirm(false)
    setSubmitting(true)
    setError('')
    const valid = rows.filter(r => r.valid)
    const token = localStorage.getItem('token')

    const chunks: typeof valid[] = []
    for (let i = 0; i < valid.length; i += CHUNK_SIZE) chunks.push(valid.slice(i, i + CHUNK_SIZE))
    setProgress({ done: 0, total: valid.length })

    const allResults: any[] = []
    for (let i = 0; i < chunks.length; i++) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/buyers/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ buyers: chunks[i].map(r => r.payload) }),
        })
        const data = await res.json()
        if (data.success) {
          allResults.push(...(data.data?.results || []))
          setProgress({ done: allResults.length, total: valid.length })
        } else {
          setError(`Chunk ${i + 1}/${chunks.length} failed: ${data.message || 'unknown error'}`)
          setSubmitting(false); setProgress(null); return
        }
      } catch {
        setError(`Network error on chunk ${i + 1}/${chunks.length}.`)
        setSubmitting(false); setProgress(null); return
      }
    }
    setResults(allResults)
    setSubmitting(false)
    setProgress(null)
  }

  return (
    <div className="min-h-screen bg-background text-heading p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button onClick={() => router.back()} className="text-muted hover:text-heading text-sm mb-2 flex items-center gap-1 transition">← Back</button>
          <h1 className="text-3xl font-bold mb-2">Bulk Upload Buyers</h1>
          <p className="text-muted">Upload an Excel file to create multiple buyers at once</p>
        </div>

        {success && <div className="bg-surface border border-border border-l-4 border-l-success-border rounded-xl px-4 py-3 mb-6 shadow-sm"><p className="text-heading text-sm font-medium">{success}</p></div>}
        {error && <div className="bg-surface border border-border border-l-4 border-l-red-500 rounded-xl px-4 py-3 mb-6 shadow-sm"><p className="text-red-700 text-sm font-medium">{error}</p></div>}

        {!results && !submitting && (
          <>
            <div className="mb-6">
              <input type="file" accept=".xlsx,.xls,.xlsm" ref={fileInputRef} onChange={handleFile} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full group bg-surface border border-border rounded-xl px-6 py-5 shadow-sm transition-colors flex items-center gap-4 text-left">
                <div className="flex-1 min-w-0">
                  <p className="text-heading font-semibold text-sm">Upload Excel with multiple buyers</p>
                  <p className="text-muted text-xs mt-0.5">One row per buyer — use the template for the expected columns</p>
                </div>
                <span className="flex-shrink-0 text-xs font-medium text-muted group-hover:text-heading transition-colors border border-border rounded-lg px-3 py-1.5">Browse</span>
              </button>
            </div>

            {rows.length > 0 && (
              <div className="bg-surface rounded-xl p-6 border border-border shadow-sm mb-6">
                <h2 className="text-lg font-semibold mb-2">Preview — {rows.length} Buyer(s)</h2>
                <div className="flex items-center gap-4 mb-4 text-sm">
                  <span className="text-success-text font-medium">{validCount} ready to submit</span>
                  {skippedCount > 0 && <span className="text-red-600 font-medium">{skippedCount} skipped due to errors</span>}
                </div>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-border-light text-left">
                      <tr>
                        <th className="p-3 font-medium text-muted">Row</th>
                        <th className="p-3 font-medium text-muted">Buyer Name</th>
                        <th className="p-3 font-medium text-muted">NTN/CNIC</th>
                        <th className="p-3 font-medium text-muted">Type</th>
                        <th className="p-3 font-medium text-muted">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(r => (
                        <tr key={r.rowNumber} className="border-t border-border">
                          <td className="p-3 font-mono text-xs">{r.rowNumber}</td>
                          <td className="p-3">{r.payload.buyerName || '—'}</td>
                          <td className="p-3 font-mono text-xs">{r.payload.buyerNtn || r.payload.buyerCnic || '—'}</td>
                          <td className="p-3">{r.payload.buyerType || '—'}</td>
                          <td className="p-3">{r.valid ? <span className="text-success-text font-medium">Ready</span> : <span className="text-red-600 font-medium">{r.errors.join(', ')}</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-4 justify-start mt-6">
                  <button onClick={requestSubmit} disabled={submitting}
                    className="bg-btn-dark hover:bg-btn-dark-hover disabled:opacity-50 text-btn-dark-text font-semibold py-3 px-8 rounded-lg transition">
                    Submit {validCount} Buyer(s)
                  </button>
                  <button type="button" onClick={() => router.push('/buyers')}
                    className="bg-surface border border-border hover:border-heading text-heading font-semibold py-3 px-8 rounded-lg transition">Cancel</button>
                </div>
              </div>
            )}
          </>
        )}

        {submitting && (
          <div className="bg-surface rounded-xl p-6 border border-border shadow-sm">
            <h2 className="text-lg font-semibold mb-4">
              Processing: {progress?.done ?? 0} / {progress?.total ?? validCount} ...
            </h2>
          </div>
        )}

        {results && (
          <div className="bg-surface rounded-xl p-6 border border-border shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Done — {results.filter(r => r.status === 'SUCCESS').length} / {results.length} created</h2>
            <div className="border border-border rounded-lg overflow-hidden">
              {results.map((r: any, i: number) => (
                <div key={i} className="flex justify-between border-t border-border first:border-t-0 py-2 px-3 text-sm">
                  <span>{r.buyerName}</span>
                  <span className={r.status === 'SUCCESS' ? 'text-success-text font-medium' : 'text-red-600 font-medium'}>
                    {r.status === 'SUCCESS' ? 'Created' : r.error}
                  </span>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => router.push('/buyers')}
              className="bg-btn-dark hover:bg-btn-dark-hover text-btn-dark-text font-semibold py-3 px-8 rounded-lg transition mt-6">Go to Buyers</button>
          </div>
        )}

        {showConfirm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-surface rounded-xl p-6 border border-border shadow-lg max-w-md w-full">
              <h3 className="text-lg font-semibold mb-2">Confirm submission</h3>
              <p className="text-muted text-sm mb-6">
                {skippedCount > 0 ? `${skippedCount} buyer(s) will be skipped due to validation errors. Submit the remaining ${validCount}?` : `Submit ${validCount} buyer(s)?`}
              </p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowConfirm(false)} className="bg-surface border border-border hover:border-heading text-heading font-medium py-2 px-5 rounded-lg transition">Cancel</button>
                <button onClick={confirmSubmit} className="bg-btn-dark hover:bg-btn-dark-hover text-btn-dark-text font-medium py-2 px-5 rounded-lg transition">Confirm Submit</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}