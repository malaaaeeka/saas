'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }
    fetchStats(token)
  }, [])

  const fetchStats = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invoices/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) setStats(data.data)
    } catch (err) {
      console.log('Failed to fetch stats')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  )

  const breakdown = stats?.breakdown

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-6xl mx-auto">

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-400 mt-1">Your FBR invoice overview</p>
        </div>

        {/* Revenue Card */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 mb-6">
          <p className="text-gray-400 text-sm mb-1">Net Revenue (Submitted to FBR)</p>
          <p className="text-5xl font-bold text-white">
            PKR {Number(stats?.totalRevenue || 0).toLocaleString()}
          </p>

          {/* Revenue breakdown */}
          {breakdown && (
            <div className="flex gap-6 mt-4 pt-4 border-t border-gray-800">
              <div>
                <p className="text-gray-500 text-xs">Sales</p>
                <p className="text-green-400 font-semibold text-sm">
                  + PKR {Number(breakdown.saleRevenue).toLocaleString()}
                </p>
              </div>
              {breakdown.debitAdded > 0 && (
                <div>
                  <p className="text-gray-500 text-xs">Debit Notes</p>
                  <p className="text-orange-400 font-semibold text-sm">
                    + PKR {Number(breakdown.debitAdded).toLocaleString()}
                  </p>
                </div>
              )}
              {breakdown.creditDeducted > 0 && (
                <div>
                  <p className="text-gray-500 text-xs">Credit Notes</p>
                  <p className="text-red-400 font-semibold text-sm">
                    - PKR {Number(breakdown.creditDeducted).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 rounded-lg p-5 border border-gray-800">
            <p className="text-gray-400 text-xs mb-1">Total Invoices</p>
            <p className="text-3xl font-bold text-white">{stats?.totalInvoices || 0}</p>
            <p className="text-gray-500 text-xs mt-1">Sales & Purchases</p>
          </div>

          <div className="bg-gray-900 rounded-lg p-5 border border-gray-800">
            <p className="text-gray-400 text-xs mb-1">Submitted to FBR</p>
            <p className="text-3xl font-bold text-green-400">{stats?.sentInvoices || 0}</p>
            <p className="text-gray-500 text-xs mt-1">Including amendments</p>
          </div>

          <div className="bg-gray-900 rounded-lg p-5 border border-gray-800">
            <p className="text-gray-400 text-xs mb-1">Pending</p>
            <p className="text-3xl font-bold text-yellow-400">{stats?.pendingInvoices || 0}</p>
            <p className="text-gray-500 text-xs mt-1">Awaiting submission</p>
          </div>

          <div className="bg-gray-900 rounded-lg p-5 border border-gray-800">
            <p className="text-gray-400 text-xs mb-1">Failed</p>
            <p className="text-3xl font-bold text-red-400">{stats?.failedInvoices || 0}</p>
            <p className="text-gray-500 text-xs mt-1">Need attention</p>
          </div>
        </div>

        {/* Tax + Amended row */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-900 rounded-lg p-5 border border-gray-800">
            <p className="text-gray-400 text-xs mb-1">Net Tax Collected</p>
            <p className="text-3xl font-bold text-blue-400">
              PKR {Number(stats?.totalTaxCollected || 0).toLocaleString()}
            </p>
            <p className="text-gray-500 text-xs mt-1">After credit/debit adjustments</p>
          </div>

          <div className="bg-gray-900 rounded-lg p-5 border border-gray-800">
            <p className="text-gray-400 text-xs mb-1">Amended Invoices</p>
            <p className="text-3xl font-bold text-gray-400">{stats?.amendedInvoices || 0}</p>
            <p className="text-gray-500 text-xs mt-1">Corrected via Credit/Debit Note</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => router.push('/create')}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition"
          >
            + Create Invoice
          </button>
          <button
            onClick={() => router.push('/invoices')}
            className="bg-gray-800 hover:bg-gray-700 px-6 py-3 rounded-lg font-semibold transition"
          >
            View All Invoices
          </button>
          {stats?.failedInvoices > 0 && (
            <button
              onClick={() => router.push('/invoices')}
              className="bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 text-red-400 px-6 py-3 rounded-lg font-semibold transition"
            >
              ⚠ {stats.failedInvoices} Failed — Review
            </button>
          )}
        </div>

      </div>
    </div>
  )
}