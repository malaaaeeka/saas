'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 w-64 h-screen bg-gray-900 border-r border-gray-800 p-6">
        <h2 className="text-2xl font-bold mb-8">Admin Panel</h2>

        <nav className="space-y-4 mb-8">
          <Link href="/admin" className="block hover:text-blue-400 transition">
            📊 Dashboard
          </Link>
          <Link href="/admin/users" className="block hover:text-blue-400 transition">
            👥 Users
          </Link>
          <Link href="/admin/ca-partners" className="block hover:text-blue-400 transition">
            🤝 CA Partners
          </Link>
          <Link href="/admin/invoices" className="block hover:text-blue-400 transition">
            📄 Invoices
          </Link>
          <Link href="/admin/revenue" className="block hover:text-blue-400 transition">
            💰 Revenue
          </Link>
          <Link href="/admin/audit-logs" className="block hover:text-blue-400 transition">
            📋 Audit Logs
          </Link>
        </nav>

        <button
          onClick={handleLogout}
          className="w-full bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition"
        >
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        <div className="max-w-6xl">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-gray-400 mb-8">System overview and analytics</p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <p className="text-gray-400 text-sm mb-1">Total Users</p>
              <p className="text-4xl font-bold">{dashboard?.totalUsers || 0}</p>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <p className="text-gray-400 text-sm mb-1">Total Invoices</p>
              <p className="text-4xl font-bold">{dashboard?.totalInvoices || 0}</p>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <p className="text-gray-400 text-sm mb-1">CA Partners</p>
              <p className="text-4xl font-bold text-green-400">{dashboard?.totalCAs || 0}</p>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <p className="text-gray-400 text-sm mb-1">This Month</p>
              <p className="text-4xl font-bold text-blue-400">
                PKR {(dashboard?.revenueThisMonth || 0).toLocaleString()}
              </p>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 lg:col-span-2">
              <p className="text-gray-400 text-sm mb-1">Total Revenue</p>
              <p className="text-5xl font-bold">
                PKR {(dashboard?.totalRevenue || 0).toLocaleString()}
              </p>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 lg:col-span-2">
              <p className="text-gray-400 text-sm mb-1">Total Tax Collected</p>
              <p className="text-5xl font-bold text-yellow-400">
                PKR {(dashboard?.totalTax || 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-4">
            <Link
              href="/admin/users"
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition"
            >
              Manage Users
            </Link>
            <Link
              href="/admin/ca-partners"
              className="bg-gray-800 hover:bg-gray-700 px-6 py-3 rounded-lg font-semibold transition"
            >
              View CA Partners
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}