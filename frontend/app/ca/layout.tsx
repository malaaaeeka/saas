'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'



export default function CALayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
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

  return (
    <div className="min-h-screen bg-background text-heading">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        .ca-nav-root {
          --text: #1e2216;
          --text-muted: #5a5a45;
          --lime: #6b8e23;
          font-family: 'DM Sans', sans-serif;
        }

        .ca-nav-bar {
          position: sticky;
          top: 0;
          z-index: 100;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2.5rem;
          height: 64px;
        }

        .ca-nav-brand {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2.2rem;
          font-weight: 300;
          font-style: italic;
          letter-spacing: -0.01em;
          color: var(--text);
          text-decoration: none;
          white-space: nowrap;
        }

        .ca-nav-links {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .ca-nav-links button {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.82rem;
          font-weight: 400;
          letter-spacing: 0.01em;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0.4rem 0.85rem;
          color: var(--text-muted);
          transition: color 0.2s ease;
        }

        .ca-nav-links button:hover {
          color: var(--lime);
        }

        .ca-nav-links button.active {
          color: var(--lime);
          font-weight: 500;
        }

        .ca-btn-logout {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.78rem;
          font-weight: 500;
          color: var(--text-muted);
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0.4rem 0.6rem;
          transition: color 0.15s ease;
        }

        .ca-btn-logout:hover {
          color: #b3261e;
        }
          .ca-user-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ca-user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #1e2216;
  color: #f0edd8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
}

.ca-user-email {
  font-size: 0.78rem;
  color: var(--text-muted);
}
      `}</style>

      <div className="ca-nav-root">
        <nav className="ca-nav-bar">
          <Link href="/ca" className="ca-nav-brand">
            CA Portal
          </Link>

          <ul className="ca-nav-links">
            {navItems.map((item) => (
              <li key={item.path}>
                <button
                  className={isActive(item.path) ? 'active' : ''}
                  onClick={() => router.push(item.path)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>F

          <div className="ca-user-chip">
            <div className="ca-user-avatar">{user?.email?.[0]?.toUpperCase()}</div>
            <span className="ca-user-email">{user?.email}</span>
            <button className="ca-btn-logout" onClick={handleLogout}>Logout</button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="p-8">
        {children}
      </div>
    </div>
  )
}