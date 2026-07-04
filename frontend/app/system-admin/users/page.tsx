'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [roleFilter, setRoleFilter] = useState('ALL')

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

  if (loading) return <p className="text-muted">Loading users...</p>

  return (
    <div className="max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Users Management</h1>
          <p className="text-muted">Manage all system users</p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6 flex gap-4">
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value)
            setPage(1)
          }}
          className="bg-surface-alt border border-border text-heading rounded-lg px-4 py-2"
        >
          <option value="ALL">All Roles</option>
          <option value="SUPER_ADMIN">System Admin</option>
          <option value="CA_PARTNER">CA Partners</option>
          <option value="BUSINESS">Business Owners</option>
        </select>
      </div>

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
            {users.map((user) => (
              <tr key={user.id} className="border-t border-border hover:bg-border-light/50">
                <td className="px-6 py-4">{user.email}</td>
                <td className="px-6 py-4">
                  <span className="bg-border-light text-link px-3 py-1 rounded text-sm">
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {user.isVerified ? (
                    <span className="text-success-text">✓ Active</span>
                  ) : (
                    <span className="text-error-text">✗ Inactive</span>
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
          Showing {users.length} of {total} users
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