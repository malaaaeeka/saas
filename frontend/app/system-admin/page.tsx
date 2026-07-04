'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminDashboard() {
  const router = useRouter()
  const [dashboard, setDashboard] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    fetchDashboard(token)
  }, [])

  const fetchDashboard = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
  setDashboard(data.data)
}
    } catch (err) {
      console.error('Failed to fetch dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-muted">Loading...</p>
    </div>
  )

  return (
    <div className="max-w-7xl">
      <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
      <p className="text-muted mb-8">System overview and analytics</p>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-surface rounded-lg p-6 border border-border">
          <p className="text-muted text-sm mb-1">Total Users</p>
          <p className="text-4xl font-bold">{dashboard?.totalUsers || 0}</p>
        </div>

        <div className="bg-surface rounded-lg p-6 border border-border">
          <p className="text-muted text-sm mb-1">Total Invoices</p>
          <p className="text-4xl font-bold">{dashboard?.totalInvoices || 0}</p>
        </div>

        <div className="bg-surface rounded-lg p-6 border border-border">
          <p className="text-muted text-sm mb-1">CA Partners</p>
          <p className="text-4xl font-bold text-success-text">{dashboard?.totalCAs || 0}</p>
        </div>

        <div className="bg-surface rounded-lg p-6 border border-border">
          <p className="text-muted text-sm mb-1">This Month</p>
          <p className="text-3xl font-bold text-link">
            PKR {(dashboard?.revenueThisMonth || 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-surface rounded-lg p-6 border border-border lg:col-span-2">
          <p className="text-muted text-sm mb-1">Total Revenue</p>
          <p className="text-5xl font-bold">
            PKR {(dashboard?.totalRevenue || 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-surface rounded-lg p-6 border border-border lg:col-span-2">
          <p className="text-muted text-sm mb-1">Total Tax Collected</p>
          <p className="text-5xl font-bold text-warning-text">
            PKR {(dashboard?.totalTax || 0).toLocaleString()}
          </p>
        </div>
      </div>
       <button
  onClick={() => window.location.href = '/system-admin/users'}
  className="bg-btn-dark hover:bg-btn-dark-hover text-btn-dark-text px-6 py-3 rounded-lg font-semibold transition"
>
  Manage Users
</button>

<button
  onClick={() => window.location.href = '/system-admin/ca-partners'}
  className="bg-surface border border-border hover:border-heading text-heading px-6 py-3 rounded-lg font-semibold transition"
>
  View CA Partners
</button>

<button
  onClick={() => window.location.href = '/system-admin/invoices'}
  className="bg-surface border border-border hover:border-heading text-heading px-6 py-3 rounded-lg font-semibold transition"
>
  View Invoices
</button>

<button
  onClick={() => window.location.href = '/system-admin/revenue'}
  className="bg-surface border border-border hover:border-heading text-heading px-6 py-3 rounded-lg font-semibold transition"
>
  Revenue Report
</button>
      </div>
   
  )
}