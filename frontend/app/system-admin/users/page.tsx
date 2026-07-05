'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const ROLE_OPTIONS = [
  { value: 'ALL', label: 'All Roles' },
  { value: 'SUPER_ADMIN', label: 'System Admin' },
  { value: 'CA_PARTNER', label: 'CA Partners' },
  { value: 'BUSINESS', label: 'Business Owners' },
]

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [roleFilter, setRoleFilter] = useState('ALL')

  const [filterOpen, setFilterOpen] = useState(false)
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
    if (userData.role !== 'SUPER_ADMIN') {
      router.push('/invoices')
      return
    }

    fetchUsers(token, page, roleFilter)
  }, [page, roleFilter])

  const fetchUsers = async (token: string, pageNum: number, role: string) => {
    try {
      const url = role === 'ALL'
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users?page=${pageNum}&limit=10`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users?page=${pageNum}&limit=10&role=${role}`

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setUsers(data.data?.users ?? data.data ?? [])
        setTotal(data.data?.total ?? data.pagination?.total ?? 0)
      }
    } catch (err) {
      console.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  // NOTE: only filters the users already loaded on the current page (10 at a
  // time), since the API paginates server-side. For true cross-database
  // search, add a `?search=` param to /api/admin/users and call it here
  // with a debounce instead of filtering client-side.
  const searchMatches = searchQuery.trim()
    ? users.filter(u => u.email.toLowerCase().includes(searchQuery.toLowerCase()))
    : []

  const visibleUsers = searchQuery.trim()
    ? users.filter(u => u.email.toLowerCase().includes(searchQuery.toLowerCase()))
    : users

  if (loading) return <p className="text-muted">Loading users...</p>

  return (
    <div className="max-w-7xl">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Users Management</h1>
          <p className="text-muted">Manage all system users</p>
        </div>

        <div className="flex items-center gap-5 pt-1">
          <button
            onClick={() => setSearchOpen(true)}
            className="text-muted hover:text-heading transition"
            aria-label="Search users"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <button
            onClick={() => setFilterOpen(o => !o)}
            className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted hover:text-heading transition"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="6" y1="12" x2="18" y2="12" />
              <line x1="9" y1="18" x2="15" y2="18" />
            </svg>
            Filter
          </button>
        </div>
      </div>

      {/* Filter panel — replaces the old <select> dropdown */}
      {filterOpen && (
        <div className="mb-8 pb-6 border-b border-border">
          <p className="text-xs font-medium uppercase tracking-wide text-muted mb-3">Role</p>
          <div className="flex flex-col gap-1">
            {ROLE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setRoleFilter(opt.value); setPage(1) }}
                className={`text-left text-sm py-1 w-fit transition ${
                  roleFilter === opt.value
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
        <div className="fixed inset-0 bg-surface z-50 flex flex-col">
          <div className="flex items-center justify-between px-8 pt-6">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">Search users</span>
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
              placeholder="Search by email…"
              className="w-full bg-transparent text-3xl font-light text-heading outline-none pb-3"
            />
          </div>
          <div className="px-8 pt-6 overflow-y-auto flex-1">
            {searchQuery.trim() === '' ? (
              <p className="text-muted text-sm">Start typing to search the current page of users…</p>
            ) : searchMatches.length === 0 ? (
              <p className="text-muted text-sm">No matches on this page for "{searchQuery}"</p>
            ) : (
              searchMatches.map(u => (
                <div
                  key={u.id}
                  onClick={() => setSearchOpen(false)}
                  className="py-3 border-b border-border cursor-pointer hover:opacity-70 transition"
                >
                  <p className="text-heading text-sm">{u.email}</p>
                  <p className="text-muted text-xs mt-0.5">{u.role}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-border-light">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Role</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Created</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map((user) => (
              <tr key={user.id} className="border-t border-border hover:bg-border-light/50">
                <td className="px-6 py-4">{user.email}</td>
                <td className="px-6 py-4">
                  <span className="bg-border-light text-link px-3 py-1 rounded text-sm">
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {user.isVerified ? (
                    <span className="text-success-text">Active</span>
                  ) : (
                    <span className="text-error-text">Inactive</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-muted">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <button className="text-link hover:opacity-70 text-sm">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex justify-between items-center">
        <p className="text-muted">
          Showing {visibleUsers.length} of {total} users
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