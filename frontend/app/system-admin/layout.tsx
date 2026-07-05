'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

export default function CALayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      try { setUser(JSON.parse(userData)) } catch { /* ignore */ }
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  const navItems = [
    { label: 'Dashboard', path: '/ca' },
    { label: 'My Clients', path: '/ca/clients' },
    { label: 'Commission', path: '/ca/commission' },
    { label: 'Referrals', path: '/ca/referrals' },
    { label: 'Settings', path: '/ca/settings' },
  ]

  const isActive = (path: string) => pathname === path

  const initial = (user?.email || user?.name || 'A').charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-background text-heading">

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface">
        <div className="flex items-center gap-8">
          <h2 className="text-2xl font-serif italic">E-Invoice</h2>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`px-3 py-1.5 rounded-lg transition text-sm font-medium ${
                  isActive(item.path)
                    ? 'text-accent font-semibold'
                    : 'text-muted hover:text-heading'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-heading text-surface text-xs font-semibold flex items-center justify-center">
                {initial}
              </span>
              <span className="text-sm text-body">{user.email}</span>
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
      <div className="p-8">
        {children}
      </div>
    </div>
  )
}