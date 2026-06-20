'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CAPartnersPage() {
  const router = useRouter()
  const [cas, setCAs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

    fetchCAs(token)
  }, [])

  const fetchCAs = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/ca-partners`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
console.log('CA Partners API:', JSON.stringify(data))
if (data.success) {
  setCAs(Array.isArray(data.data) ? data.data : data.data?.caPartners ?? data.data?.cas ?? [])
}
    } catch (err) {
      console.error('Failed to fetch CA partners:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <p className="text-gray-400">Loading CA partners...</p>

  return (
    <div className="max-w-7xl">
      <h1 className="text-3xl font-bold mb-2">CA Partners</h1>
      <p className="text-gray-400 mb-8">Manage chartered accountant partners</p>

      {cas.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {cas.map((ca) => (
            <div key={ca.id} className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-blue-500 transition">
              <h3 className="text-lg font-bold mb-2">{ca.firmName}</h3>
              <p className="text-gray-400 text-sm mb-4">ICAP: {ca.icapNumber}</p>
              
              <div className="space-y-3 mb-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Clients:</span>
                  <span className="font-semibold text-blue-400">{ca.clientCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Commission:</span>
                  <span className="font-semibold">{ca.commissionPct}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Email:</span>
                  <span className="text-sm">{ca.user?.email}</span>
                </div>
              </div>

              <button className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium transition">
                View Details
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          No CA partners registered yet
        </div>
      )}
    </div>
  )
}