'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RevenuePage() {
  const router = useRouter()
  const [revenue, setRevenue] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    fetchRevenue(token)
  }, [])

  const fetchRevenue = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/revenue`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setRevenue(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch revenue')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <p>Loading...</p>

  return (
    <div className="max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">Revenue Report</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <p className="text-gray-400 text-sm mb-1">Total Revenue</p>
          <p className="text-4xl font-bold">
            PKR {(revenue?.totalRevenue || 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <p className="text-gray-400 text-sm mb-1">Total Tax</p>
          <p className="text-4xl font-bold text-yellow-400">
            PKR {(revenue?.totalTax || 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <p className="text-gray-400 text-sm mb-1">Invoices by Status</p>
          <p className="text-2xl font-bold">
            {revenue?.invoicesByStatus?.length || 0} statuses
          </p>
        </div>
      </div>

      {/* CA Earnings */}
      <h2 className="text-2xl font-bold mb-4">CA Partner Earnings</h2>
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">CA Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Commission %</th>
            </tr>
          </thead>
          <tbody>
            {revenue?.caEarnings?.map((ca: any) => (
              <tr key={ca.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                <td className="px-6 py-4">{ca.firmName}</td>
                <td className="px-6 py-4">{ca.user.email}</td>
                <td className="px-6 py-4">{ca.commissionPct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}