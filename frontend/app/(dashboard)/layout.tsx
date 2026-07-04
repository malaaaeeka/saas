'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) setUser(JSON.parse(userData))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  const navItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Create Invoice', path: '/create' },
    { label: 'Invoices', path: '/invoices' },
    { label: 'Settings', path: '/settings' },
  ]

  const isActive = (path: string) => pathname === path

  return (
    <div className="min-h-screen bg-background text-heading">

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface">
        <div className="flex items-center gap-8">
          <h1 className="text-lg font-bold text-link">eInvoice</h1>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`px-3 py-1.5 rounded-lg transition text-sm font-medium ${
                  isActive(item.path)
                    ? 'bg-btn-dark text-btn-dark-text'
                    : 'text-muted hover:bg-border-light hover:text-heading'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-btn-dark text-btn-dark-text flex items-center justify-center text-xs font-bold">
                {user.email?.[0]?.toUpperCase()}
              </div>
              <p className="text-xs text-muted">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-muted hover:text-error-text transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="overflow-auto">
        {children}
      </div>

    </div>
  )
}