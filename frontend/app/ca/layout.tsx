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
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 w-64 h-screen bg-gray-900 border-r border-gray-800 p-6">
        <h2 className="text-2xl font-bold mb-8">CA Portal</h2>

        <nav className="space-y-4 mb-8">
          <Link href="/ca" className="block hover:text-blue-400 transition">
            📊 Dashboard
          </Link>
          <Link href="/ca/clients" className="block hover:text-blue-400 transition">
            👥 My Clients
          </Link>
          <Link href="/ca/commission" className="block hover:text-blue-400 transition">
            💰 Commission
          </Link>
          <Link href="/ca/referrals" className="block hover:text-blue-400 transition">
            🔗 Referrals
          </Link>
          <Link href="/ca/settings" className="block hover:text-blue-400 transition">
            ⚙️ Settings
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
        {children}
      </div>
    </div>
  )
}