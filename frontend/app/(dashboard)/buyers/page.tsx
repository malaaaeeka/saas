'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Buyer {
  id: string
  buyerName: string
  buyerNtn: string | null
  buyerCnic: string | null
  buyerType: string | null
  address: string | null
  phone: string | null
  email: string | null
}

export default function BuyersPage() {
  const router = useRouter()
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const fetchBuyers = useCallback(async (q: string) => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const url = q.trim()
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/buyers?q=${encodeURIComponent(q)}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/buyers`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) {
        setBuyers(data.data || [])
      } else {
        setError('Failed to load buyers')
      }
    } catch {
      setError('Cannot reach server')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }
    fetchBuyers('')
  }, [fetchBuyers, router])

  const handleSearchChange = (val: string) => {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchBuyers(val), 300)
  }

  return (
    <div className="min-h-screen bg-background text-heading p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Buyers</h1>
          <p className="text-muted">All buyers saved to your business</p>
        </div>

        <div className="mb-6">
          <input
            type="text"
            value={query}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search by name, NTN, or CNIC..."
            className="w-full max-w-md bg-surface border border-border text-heading rounded-lg px-4 py-2 focus:outline-none focus:border-accent"
          />
        </div>

        {error && (
          <div className="bg-surface border border-border border-l-4 border-l-red-500 rounded-xl px-4 py-3 mb-6 shadow-sm">
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="bg-surface rounded-xl border border-border shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">NTN</th>
                <th className="px-4 py-3">CNIC</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Address</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-muted">Loading...</td></tr>
              ) : buyers.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-muted">No buyers found</td></tr>
              ) : (
                buyers.map(b => (
                  <tr key={b.id} className="border-b border-border last:border-0 text-body">
                    <td className="px-4 py-3 font-medium text-heading">{b.buyerName}</td>
                    <td className="px-4 py-3">{b.buyerNtn || '—'}</td>
                    <td className="px-4 py-3">{b.buyerCnic || '—'}</td>
                    <td className="px-4 py-3">{b.buyerType || '—'}</td>
                    <td className="px-4 py-3">{b.phone || '—'}</td>
                    <td className="px-4 py-3">{b.email || '—'}</td>
                    <td className="px-4 py-3">{b.address || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}