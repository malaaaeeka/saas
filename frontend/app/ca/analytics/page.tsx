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

  if (loading) return <p className="text-muted">Loading analytics...</p>

  return (
    <div className="max-w-7xl">
      <h1 className="text-3xl font-bold mb-2">Analytics</h1>
      <p className="text-muted mb-8">Performance and insights</p>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-surface rounded-lg p-6 border border-border">
          <p className="text-muted text-sm mb-2">Total Clients</p>
          <p className="text-4xl font-bold text-link">
            {analytics?.clientCount || 0}
          </p>
        </div>

        <div className="bg-surface rounded-lg p-6 border border-border">
          <p className="text-muted text-sm mb-2">Total Invoices</p>
          <p className="text-4xl font-bold text-success-text">
            {analytics?.totalInvoices || 0}
          </p>
        </div>

        <div className="bg-surface rounded-lg p-6 border border-border">
          <p className="text-muted text-sm mb-2">Commission Rate</p>
          <p className="text-4xl font-bold text-warning-text">
            {analytics?.commissionRate || 0}%
          </p>
        </div>

        <div className="bg-surface rounded-lg p-6 border border-border">
          <p className="text-muted text-sm mb-2">Total Revenue</p>
          <p className="text-3xl font-bold">
            PKR {(analytics?.totalRevenue || 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Earnings Summary */}
      <div className="bg-surface rounded-lg p-6 border border-border mb-8">
        <h2 className="text-xl font-bold mb-4">Earnings Summary</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-muted text-sm">Total Client Revenue</p>
            <p className="text-3xl font-bold mt-2">
              PKR {(analytics?.totalRevenue || 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-muted text-sm">Your Commission Earnings</p>
            <p className="text-3xl font-bold mt-2 text-success-text">
              PKR {(analytics?.commissionEarnings || 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="bg-surface rounded-lg p-6 border border-border">
        <h2 className="text-xl font-bold mb-4">Revenue Trend</h2>
        <div className="h-64 bg-border-light rounded flex items-center justify-center">
          <p className="text-muted">Chart visualization coming soon</p>
        </div>
      </div>
    </div>
  )
}