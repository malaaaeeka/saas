'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function InvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState('ALL')

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

    fetchInvoices(token, page, statusFilter)
  }, [page, statusFilter])

  const fetchInvoices = async (token: string, pageNum: number, status: string) => {
    try {
      const url = status === 'ALL'
        ? `http://localhost:5000/api/admin/invoices?page=${pageNum}&limit=10`
        : `http://localhost:5000/api/admin/invoices?page=${pageNum}&limit=10&status=${status}`
      
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
       setInvoices(Array.isArray(data.data) ? data.data : data.data?.data ?? [])
setTotal(data.pagination?.total ?? data.data?.total ?? 0)
      }
    } catch (err) {
      console.error('Failed to fetch invoices')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <p className="text-gray-400">Loading invoices...</p>

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'SENT': return 'bg-green-900 text-green-200'
      case 'FAILED': return 'bg-red-900 text-red-200'
      case 'PENDING': return 'bg-yellow-900 text-yellow-200'
      case 'RETRY': return 'bg-orange-900 text-orange-200'
      default: return 'bg-gray-800 text-gray-200'
    }
  }

  return (
    <div className="max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Invoices Overview</h1>
          <p className="text-gray-400">All system invoices</p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6 flex gap-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2"
        >
          <option value="ALL">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="SENT">Sent</option>
          <option value="FAILED">Failed</option>
          <option value="RETRY">Retry</option>
        </select>
      </div>

      {/* Invoices Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Invoice ID</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Business</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Amount</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length > 0 ? (
              invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                  <td className="px-6 py-4 text-sm font-mono">{inv.id.substring(0, 8)}...</td>
                  <td className="px-6 py-4">{inv.business?.businessName || 'N/A'}</td>
                  <td className="px-6 py-4 font-medium">
                    PKR {Number(inv.totalAmount).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded text-sm ${getStatusColor(inv.status)}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-blue-400 hover:text-blue-300 text-sm">
                      View
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  No invoices found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex justify-between items-center">
        <p className="text-gray-400">
          Showing {invoices.length} of {total} invoices
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 px-4 py-2 rounded"
          >
            Previous
          </button>
          <span className="px-4 py-2">Page {page}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page * 10 >= total}
            className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 px-4 py-2 rounded"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}