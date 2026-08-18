'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'


export default function ClientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [client, setClient] = useState<any>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [profileOpen, setProfileOpen] = useState(false)
  const [invoicesOpen, setInvoicesOpen] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    fetchData(token)
  }, [clientId])

  const fetchData = async (token: string) => {
    try {
      const [clientRes, invoicesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ca/client/${clientId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ca/client/${clientId}/invoices`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      const clientData = await clientRes.json()
      const invoicesData = await invoicesRes.json()

      if (clientData.success) {
        setClient(clientData.data)
      } else {
        setError(clientData.message || 'Client not found')
      }

      if (invoicesData.success) {
        setInvoices(Array.isArray(invoicesData.data) ? invoicesData.data : [])
      }
    } catch (err) {
      setError('Cannot connect to server')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <p className="text-muted">Loading client...</p>
  if (error) return <p className="text-error-text">{error}</p>
  if (!client) return null

  return (
    <div className="max-w-5xl">
      <Link href="/ca/clients" className="text-sm text-muted hover:text-heading mb-6 inline-block">
        ← Back to My Clients
      </Link>

      <h1 className="text-3xl font-bold mb-2">{client.businessName}</h1>
      <p className="text-muted mb-8">{client.user?.email}</p>

  {/* Profile */}
<div className="bg-surface rounded-xl border border-border shadow-sm mb-6 overflow-hidden">
  <button
    onClick={() => setProfileOpen(v => !v)}
    className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-surface-alt transition"
  >
    <span className="font-semibold text-heading">
      {profileOpen ? 'Hide Business Profile' : 'View Business Profile'}
    </span>
    <span className={`text-muted transition-transform ${profileOpen ? 'rotate-180' : ''}`}>▼</span>
  </button>

  {profileOpen && (
    <div className="border-t border-border p-6">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted">Business Type</p>
          <p className="text-heading">{client.businessType}</p>
        </div>
        <div>
          <p className="text-muted">NTN / CNIC</p>
          <p className="text-heading font-mono">{client.ntn}</p>
        </div>
        <div>
          <p className="text-muted">Address</p>
          <p className="text-heading">{client.address || 'N/A'}</p>
        </div>
        <div>
          <p className="text-muted">City</p>
          <p className="text-heading">{client.city || 'N/A'}</p>
        </div>
        <div>
          <p className="text-muted">Phone</p>
          <p className="text-heading">{client.phone || 'N/A'}</p>
        </div>
        <div>
          <p className="text-muted">Whitelisted</p>
          <p className="text-heading">{client.isWhitelisted ? 'Yes' : 'No'}</p>
        </div>
      </div>
    </div>
  )}
</div>

{/* Invoices */}
<div className="bg-surface rounded-xl border border-border shadow-sm mb-6 overflow-hidden">
  <button
    onClick={() => setInvoicesOpen(v => !v)}
    className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-surface-alt transition"
  >
    <span className="font-semibold text-heading">
      {invoicesOpen ? 'Hide Invoices' : 'View Invoices'}
    </span>
    <span className={`text-muted transition-transform ${invoicesOpen ? 'rotate-180' : ''}`}>▼</span>
  </button>

  {invoicesOpen && (
    <div className="border-t border-border overflow-x-auto">
      <table className="w-full">
        <thead className="bg-surface-alt">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold">Invoice #</th>
            <th className="px-6 py-3 text-left text-sm font-semibold">Amount</th>
            <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
          </tr>
        </thead>
        <tbody>
          {invoices.length > 0 ? (
            invoices.map(inv => (
              <tr key={inv.id} className="border-t border-border">
                <td className="px-6 py-4 text-sm">{inv.invoiceNumber || inv.id}</td>
                <td className="px-6 py-4 text-sm">{inv.totalAmount}</td>
                <td className="px-6 py-4 text-sm">
                  {new Date(inv.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="px-6 py-8 text-center text-muted">
                No invoices yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )}
</div>
    
      
    </div>
  )
}