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
    <div className="flex min-h-screen bg-gray-950 text-white">

      {/* Sidebar */}
      <div className={`flex flex-col bg-gray-900 border-r border-gray-800 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>

        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-gray-800">
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold text-blue-400">eInvoice</h1>
              <p className="text-xs text-gray-500">FBR Integration</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-400 hover:text-white transition p-1 rounded"
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {/* User Info */}
        {!collapsed && user && (
          <div className="px-4 py-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
                {user.email?.[0]?.toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
                <p className="text-xs text-blue-400 capitalize">{user.role?.toLowerCase()}</p>
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
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-2 py-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition text-sm font-medium"
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