'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

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

  if (loading) return <p className="text-gray-400">Loading clients...</p>

  return (
    <div className="max-w-7xl">
      <h1 className="text-3xl font-bold mb-2">My Clients</h1>
      <p className="text-gray-400 mb-8">Manage your referred businesses</p>

      {/* Clients Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Business Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">NTN</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Contact Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">City</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.length > 0 ? (
              clients.map((client) => (
                <tr key={client.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                  <td className="px-6 py-4 font-medium">{client.businessName}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{client.ntn}</td>
                  <td className="px-6 py-4 text-sm">{client.user?.email}</td>
                  <td className="px-6 py-4 text-sm">{client.address || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <button className="text-blue-400 hover:text-blue-300 text-sm">
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                  No clients yet. Start referring businesses to earn commission!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex justify-between items-center">
        <p className="text-gray-400">
          Showing {clients.length} of {total} clients
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