
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
  const [sortOpen, setSortOpen] = useState(false)
  const [sortBy, setSortBy] = useState('name-asc')

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

  const filteredClients = searchQuery.trim()
    ? clients.filter(c =>
        (c.businessName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.ntn || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : clients

  const visibleClients = [...filteredClients].sort((a, b) => {
    switch (sortBy) {
      case 'name-asc':
        return (a.businessName || '').localeCompare(b.businessName || '')
      case 'name-desc':
        return (b.businessName || '').localeCompare(a.businessName || '')
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      default:
        return 0
    }
  })

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
            <button
              onClick={() => setSortOpen(o => !o)}
              className="flex items-center gap-2 text-sm text-muted hover:text-heading transition"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="6" y1="12" x2="18" y2="12" />
                <line x1="9" y1="18" x2="15" y2="18" />
              </svg>
              Sort
            </button>
          </div>
          <span className="text-sm text-muted">{total} total clients</span>
        </div>
      </div>

      {/* Sort panel */}
      {sortOpen && (
        <div className="mb-8 pb-6 border-b border-border">
          <p className="text-xs font-medium uppercase tracking-wide text-muted mb-3">Sort by</p>
          <div className="flex flex-col gap-1">
            {[
              { value: 'name-asc', label: 'Business Name (A-Z)' },
              { value: 'name-desc', label: 'Business Name (Z-A)' },
              { value: 'newest', label: 'Newest First' },
              { value: 'oldest', label: 'Oldest First' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={`text-left text-sm py-1 w-fit transition ${
                  sortBy === opt.value
                    ? 'text-heading font-medium underline underline-offset-4'
                    : 'text-muted hover:text-heading'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search overlay */}
      {searchOpen && (
        <div className="fixed inset-x-0 top-16 bottom-0 bg-background z-[100] flex flex-col">
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
          <div className="px-8 pt-3">
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-6xl italic font-serif text-heading placeholder-border border-b border-border focus:outline-none pb-4 mb-2"
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