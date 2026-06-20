'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CommissionPage() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    if (!token || !user) { router.push('/login'); return }
    const userData = JSON.parse(user)
    if (userData.role !== 'CA_PARTNER') { router.push('/login'); return }
    fetchData(token)
  }, [])

  const fetchData = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ca/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <p className="text-gray-400">Loading...</p>

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Commission</h1>
      <p className="text-gray-400 mb-8">Your earnings and commission details</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <p className="text-gray-400 text-sm mb-2">Commission Rate</p>
          <p className="text-3xl font-bold text-blue-400">{data?.commissionRate || 0}%</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <p className="text-gray-400 text-sm mb-2">Total Earnings</p>
          <p className="text-3xl font-bold text-yellow-400">PKR {data?.myEarnings || 0}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <p className="text-gray-400 text-sm mb-2">Client Revenue</p>
          <p className="text-3xl font-bold text-green-400">PKR {data?.clientRevenue || 0}</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">How Commission Works</h2>
        <div className="space-y-3 text-gray-400">
          <p>• Your clients create invoices on the platform</p>
          <p>• You earn {data?.commissionRate || 0}% of every invoice amount</p>
          <p>• Earnings are calculated automatically</p>
          <p>• Contact admin to update your commission rate</p>
        </div>
      </div>
    </div>
  )
}