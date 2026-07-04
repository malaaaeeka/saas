'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CADashboard() {
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ca/dashboard`, {
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

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  if (loading) return (
    <div className="min-h-screen bg-background text-heading flex items-center justify-center">
      <p className="text-muted">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-background text-heading">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 w-64 h-screen bg-surface border-r border-border p-6">
        <h2 className="text-2xl font-bold mb-8">CA Portal</h2>

        <nav className="space-y-4 mb-8">
          <Link href="/ca" className="block hover:text-link transition">
            📊 Dashboard
          </Link>
          <Link href="/ca/clients" className="block hover:text-link transition">
            👥 My Clients
          </Link>
          <Link href="/ca/commission" className="block hover:text-link transition">
            💰 Commission
          </Link>
          <Link href="/ca/referrals" className="block hover:text-link transition">
            🔗 Referrals
          </Link>
          <Link href="/ca/settings" className="block hover:text-link transition">
            ⚙️ Settings
          </Link>
        </nav>

        <button
          onClick={handleLogout}
          className="w-full bg-error-bg hover:bg-error-bg/70 border border-error-border text-error-text px-4 py-2 rounded-lg transition"
        >
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        <div className="max-w-6xl">
          <h1 className="text-3xl font-bold mb-2">CA Dashboard</h1>
          <p className="text-muted mb-8">Your performance and earnings</p>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-surface rounded-lg p-6 border border-border">
              <p className="text-muted text-sm mb-1">My Clients</p>
              <p className="text-4xl font-bold text-success-text">
                {dashboard?.totalClients ?? dashboard?.clientCount ?? dashboard?.clients ?? 0}
              </p>
            </div>

            <div className="bg-surface rounded-lg p-6 border border-border">
              <p className="text-muted text-sm mb-1">Total Invoices</p>
              <p className="text-4xl font-bold">
                {dashboard?.totalInvoices || 0}
              </p>
            </div>

            <div className="bg-surface rounded-lg p-6 border border-border">
              <p className="text-muted text-sm mb-1">Commission Rate</p>
              <p className="text-4xl font-bold text-link">
                {dashboard?.commissionRate ?? 0}%
              </p>
            </div>

            <div className="bg-surface rounded-lg p-6 border border-border lg:col-span-2">
              <p className="text-muted text-sm mb-1">Client Revenue</p>
              <p className="text-5xl font-bold">
                PKR {(dashboard?.clientRevenue ?? 0).toLocaleString()}
              </p>
            </div>

            <div className="bg-surface rounded-lg p-6 border border-border">
              <p className="text-muted text-sm mb-1">My Earnings</p>
              <p className="text-4xl font-bold text-warning-text">
                PKR {(dashboard?.myEarnings ?? 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-4">
            <Link
              href="/ca/clients"
              className="bg-btn-dark hover:bg-btn-dark-hover text-btn-dark-text px-6 py-3 rounded-lg font-semibold transition"
            >
              View My Clients
            </Link>
            <Link
              href="/ca/referrals"
              className="bg-surface border border-border hover:border-heading text-heading px-6 py-3 rounded-lg font-semibold transition"
            >
              Share Referral Link
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}