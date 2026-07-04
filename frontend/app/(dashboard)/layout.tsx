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
  const [collapsed, setCollapsed] = useState(false)

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
    { label: 'Dashboard', path: '/dashboard', icon: '🏠' },
    { label: 'Create Invoice', path: '/create', icon: '➕' },
    { label: 'Invoices', path: '/invoices', icon: '📄' },
    { label: 'Settings', path: '/settings', icon: '⚙️' },
  ]

  const isActive = (path: string) => pathname === path

  return (
    <div className="flex min-h-screen bg-background text-heading">

      {/* Sidebar */}
      <div className={`flex flex-col bg-surface border-r border-border transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>

        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-border">
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold text-link">eInvoice</h1>
              <p className="text-xs text-muted">FBR Integration</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-muted hover:text-heading transition p-1 rounded"
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {/* User Info */}
        {!collapsed && user && (
          <div className="px-4 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-btn-dark text-btn-dark-text flex items-center justify-center text-sm font-bold">
                {user.email?.[0]?.toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs text-muted truncate">{user.email}</p>
                <p className="text-xs text-link capitalize">{user.role?.toLowerCase()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav Items */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm font-medium ${
                isActive(item.path)
                  ? 'bg-btn-dark text-btn-dark-text'
                  : 'text-muted hover:bg-border-light hover:text-heading'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-2 py-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted hover:bg-error-bg hover:text-error-text transition text-sm font-medium"
          >
            <span className="text-lg">🚪</span>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>

    </div>
  )
}