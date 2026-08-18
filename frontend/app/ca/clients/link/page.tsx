'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LinkClientPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSearch = async (e: any) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (query.trim().length < 3) {
      setError('Enter at least 3 characters')
      return
    }
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ca/search-business?query=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setResults(data.data)
        if (data.data.length === 0) setError('No businesses found')
      } else {
        setError(data.message || 'Search failed')
      }
    } catch {
      setError('Cannot connect to server')
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = async (businessId: string) => {
    setAssigningId(businessId)
    setError('')
    setSuccess('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ca/assign-client/${businessId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(`${data.data.businessName} has been linked to your account`)
        setResults(prev => prev.filter(b => b.id !== businessId))
      } else {
        setError(data.message || 'Failed to link business')
      }
    } catch {
      setError('Cannot connect to server')
    } finally {
      setAssigningId(null)
    }
  }

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => router.push('/ca/clients')}
        className="text-sm text-muted hover:text-heading mb-6 inline-flex items-center gap-1"
      >
        ← Back to My Clients
      </button>

      <h1 className="text-3xl font-bold mb-2">Link Existing Business</h1>
      <p className="text-muted mb-8">
        Search for a business that already has an account and link it to your CA profile.
      </p>

      <form onSubmit={handleSearch} className="relative mb-8">
  <svg
    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
    width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
  <input
    type="text"
    value={query}
    onChange={e => setQuery(e.target.value)}
    placeholder="Search by business name, NTN, or email"
    className="w-full bg-surface border border-border text-heading rounded-xl pl-11 pr-32 py-4 text-sm focus:outline-none focus:border-accent transition shadow-sm"
  />
  <button
    type="submit"
    disabled={loading}
    className="absolute right-2 top-1/2 -translate-y-1/2 bg-btn-dark hover:bg-btn-dark-hover disabled:bg-border-light disabled:text-muted text-btn-dark-text px-5 py-2 rounded-lg text-sm font-semibold transition"
  >
    {loading ? 'Searching...' : 'Search'}
  </button>
</form>

      {error && (
        <div className="bg-surface border border-border border-l-4 border-l-error-border rounded-xl px-4 py-3 mb-4 shadow-sm">
          <p className="text-heading text-sm font-medium">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-surface border border-border border-l-4 border-l-success-border rounded-xl px-4 py-3 mb-4 shadow-sm">
          <p className="text-heading text-sm font-medium">{success}</p>
        </div>
      )}

    {results.length > 0 && (
  <div className="space-y-3">
    {results.map(business => (
      <div
        key={business.id}
        className="flex items-center justify-between bg-surface border border-border rounded-xl px-6 py-5 shadow-sm hover:border-heading/20 transition"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-border-light flex items-center justify-center text-heading font-semibold text-sm flex-shrink-0">
            {business.businessName?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-semibold text-heading">{business.businessName}</p>
            <p className="text-sm text-muted mt-0.5">
              {business.user?.email} <span className="text-border-light">·</span> NTN {business.ntn}
            </p>
          </div>
        </div>

        {business.caId ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted bg-border-light px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-muted" />
            Already Linked
          </span>
        ) : (
          <button
            onClick={() => handleAssign(business.id)}
            disabled={assigningId === business.id}
            className="bg-btn-dark hover:bg-btn-dark-hover disabled:bg-border-light disabled:text-muted text-btn-dark-text px-5 py-2 rounded-lg text-sm font-semibold transition"
          >
            {assigningId === business.id ? 'Linking...' : 'Assign to Me'}
          </button>
        )}
      </div>
    ))}
  </div>
)}
    </div>
  )
}