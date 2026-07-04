'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CALayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-background text-heading">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 w-64 h-screen bg-surface border-r border-border p-6">
        <h2 className="text-2xl font-bold mb-8">CA Portal</h2>

        <nav className="space-y-4 mb-8">
          <Link href="/ca" className="block hover:text-link transition">
             Dashboard
          </Link>
          <Link href="/ca/clients" className="block hover:text-link transition">
             My Clients
          </Link>
          <Link href="/ca/commission" className="block hover:text-link transition">
             Commission
          </Link>
          <Link href="/ca/referrals" className="block hover:text-link transition">
             Referrals
          </Link>
          <Link href="/ca/settings" className="block hover:text-link transition">
             Settings
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