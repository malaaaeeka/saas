
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    
    if (!token || !user) {
      router.push('/login')
      return
    }

    const userData = JSON.parse(user)
    if (userData.role !== 'CA_PARTNER') {
      router.push('/invoices')
      return
    }

    fetchClients(token, page)
  }, [page])

  const fetchClients = async (token: string, pageNum: number) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ca/clients?page=${pageNum}&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
console.log('API Response:', JSON.stringify(data))
if (data.success) {
  setClients(Array.isArray(data.data) ? data.data : data.data?.businesses ?? [])
setTotal(data.pagination?.total ?? data.data?.total ?? 0)
}
    } catch (err) {
      console.error('Failed to fetch clients')
    } finally {
      setLoading(false)
    }
  }

  // NOTE: same caveat as other pages — this only searches clients already
  // loaded on the current page (10 at a time). For true cross-database
  // search, add a `?search=` param on the /api/ca/clients route and call
  // it here instead of filtering client-side.
  const searchMatches = searchQuery.trim()
    ? clients.filter(c =>
        (c.businessName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.ntn || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  const visibleClients = searchQuery.trim()
    ? clients.filter(c =>
        (c.businessName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.ntn || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : clients

  if (loading) return <p className="text-muted">Loading clients...</p>

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Clients</h1>
        <p className="text-muted mb-6">Manage your referred businesses</p>

        <div className="flex justify-between items-center pb-4 border-b border-border">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 text-sm text-muted hover:text-heading transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Search
            </button>
          </div>
          <span className="text-sm text-muted">{total} total clients</span>
        </div>
      </div>

      {/* Search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 bg-surface z-50 flex flex-col">
          <div className="flex items-center justify-between px-8 pt-6">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">Search clients</span>
            <button
              onClick={() => { setSearchOpen(false); setSearchQuery('') }}
              className="text-muted hover:text-heading transition text-lg"
              aria-label="Close search"
            >
              ✕
            </button>
          </div>
          <div className="px-8 pt-3 border-b border-border">
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by business name or NTN…"
              className="w-full bg-transparent text-3xl font-light text-heading outline-none pb-3"
            />
          </div>
          <div className="px-8 pt-6 overflow-y-auto flex-1">
            {searchQuery.trim() === '' ? (
              <p className="text-muted text-sm">Start typing to search the current page of clients…</p>
            ) : searchMatches.length === 0 ? (
              <p className="text-muted text-sm">No matches on this page for "{searchQuery}"</p>
            ) : (
              searchMatches.map(client => (
                <div
                  key={client.id}
                  onClick={() => setSearchOpen(false)}
                  className="py-3 border-b border-border cursor-pointer hover:opacity-70 transition"
                >
                  <p className="text-heading text-sm font-medium">{client.businessName}</p>
                  <p className="text-muted text-xs mt-0.5">
                    NTN: {client.ntn} — {client.user?.email}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Clients Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-border-light">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Business Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">NTN</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Contact Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">City</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleClients.length > 0 ? (
              visibleClients.map((client) => (
                <tr key={client.id} className="border-t border-border hover:bg-border-light/50">
                  <td className="px-6 py-4 font-medium">{client.businessName}</td>
                  <td className="px-6 py-4 text-sm text-muted">{client.ntn}</td>
                  <td className="px-6 py-4 text-sm">{client.user?.email}</td>
                  <td className="px-6 py-4 text-sm">{client.address || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <button className="text-link hover:opacity-70 text-sm">
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-muted">
                  No clients yet. Start referring businesses to earn commission!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex justify-between items-center">
        <p className="text-muted">
          Showing {visibleClients.length} of {total} clients
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="bg-surface border border-border hover:border-heading text-heading disabled:opacity-50 px-4 py-2 rounded"
          >
            Previous
          </button>
          <span className="px-4 py-2">Page {page}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page * 10 >= total}
            className="bg-surface border border-border hover:border-heading text-heading disabled:opacity-50 px-4 py-2 rounded"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}