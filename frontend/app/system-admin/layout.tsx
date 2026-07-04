'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (!token || !userData) {
      router.push('/login')
      return
    }
    const user = JSON.parse(userData)
    if (user.role !== 'SUPER_ADMIN') {
      router.push('/login')
      return
    }
    setUser(user)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-background text-heading">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 w-64 h-screen bg-surface border-r border-border p-6 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-8">Admin Panel</h2>

        <nav className="space-y-2 mb-8">
          <Link href="/system-admin" className="block px-4 py-2 hover:bg-border-light rounded transition">
  📊 Dashboard
</Link>
<Link href="/system-admin/users" className="block px-4 py-2 hover:bg-border-light rounded transition">
  👥 Users
</Link>
<Link href="/system-admin/ca-partners" className="block px-4 py-2 hover:bg-border-light rounded transition">
  🤝 CA Partners
</Link>
<Link href="/system-admin/invoices" className="block px-4 py-2 hover:bg-border-light rounded transition">
  📄 Invoices
</Link>
<Link href="/system-admin/revenue" className="block px-4 py-2 hover:bg-border-light rounded transition">
  💰 Revenue
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
        {children}
      </div>
    </div>
  )
}