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

      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by business name, NTN, or email"
          className="flex-1 bg-surface border border-border text-heading rounded-lg px-4 py-2 focus:outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-btn-dark hover:bg-btn-dark-hover disabled:bg-border-light disabled:text-muted text-btn-dark-text px-6 py-2 rounded-lg font-semibold transition"
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
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          {results.map(business => (
            <div
              key={business.id}
              className="flex items-center justify-between px-6 py-4 border-t border-border first:border-t-0"
            >
              <div>
                <p className="font-medium text-heading">{business.businessName}</p>
                <p className="text-sm text-muted">
                  {business.user?.email} · NTN: {business.ntn}
                  {business.caId && ' · Already linked to a CA'}
                </p>
              </div>
              <button
                onClick={() => handleAssign(business.id)}
                disabled={assigningId === business.id || !!business.caId}
                className="bg-btn-dark hover:bg-btn-dark-hover disabled:bg-border-light disabled:text-muted text-btn-dark-text px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                {assigningId === business.id ? 'Linking...' : business.caId ? 'Already Linked' : 'Assign to Me'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}