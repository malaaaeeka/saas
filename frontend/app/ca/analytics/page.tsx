'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AnalyticsPage() {
  const router = useRouter()
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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

    fetchAnalytics(token)
  }, [])

  const fetchAnalytics = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ca/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setAnalytics(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <p className="text-gray-400">Loading analytics...</p>

  return (
    <div className="max-w-7xl">
      <h1 className="text-3xl font-bold mb-2">Analytics</h1>
      <p className="text-gray-400 mb-8">Performance and insights</p>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <p className="text-gray-400 text-sm mb-2">Total Clients</p>
          <p className="text-4xl font-bold text-blue-400">
            {analytics?.clientCount || 0}
          </p>
        </div>

        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <p className="text-gray-400 text-sm mb-2">Total Invoices</p>
          <p className="text-4xl font-bold text-green-400">
            {analytics?.totalInvoices || 0}
          </p>
        </div>

        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <p className="text-gray-400 text-sm mb-2">Commission Rate</p>
          <p className="text-4xl font-bold text-yellow-400">
            {analytics?.commissionRate || 0}%
          </p>
        </div>

        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <p className="text-gray-400 text-sm mb-2">Total Revenue</p>
          <p className="text-3xl font-bold">
            PKR {(analytics?.totalRevenue || 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Earnings Summary */}
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 mb-8">
        <h2 className="text-xl font-bold mb-4">Earnings Summary</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-400 text-sm">Total Client Revenue</p>
            <p className="text-3xl font-bold mt-2">
              PKR {(analytics?.totalRevenue || 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Your Commission Earnings</p>
            <p className="text-3xl font-bold mt-2 text-green-400">
              PKR {(analytics?.commissionEarnings || 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
        <h2 className="text-xl font-bold mb-4">Revenue Trend</h2>
        <div className="h-64 bg-gray-800 rounded flex items-center justify-center">
          <p className="text-gray-500">Chart visualization coming soon</p>
        </div>
      </div>
    </div>
  )
}