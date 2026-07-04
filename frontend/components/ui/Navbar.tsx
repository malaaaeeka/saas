'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (userData && token) {
      setUser(JSON.parse(userData));
    } else {
      setUser(null);
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  const loggedInLinks = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Create Invoice', path: '/create' },
    { label: 'Invoices', path: '/invoices' },
    { label: 'Settings', path: '/settings' },
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');

       .nav-root {
  --bg: #1e2216;
  --lime: #6b8e23;
  --text: #1e2216;
  --text-muted: #5a5a45;
  --border: rgba(30,34,22,0.15);
  font-family: 'DM Sans', sans-serif;
}

        .nav-bar {
          position: sticky;
          top: 0;
          z-index: 100;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2.5rem;
          height: 64px;
          transition: background 0.2s;
        }

        @media (max-width: 768px) {
          .nav-bar { padding: 0 1.25rem; }
        }

        /* Brand */
        .nav-brand {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2.2rem;
          font-weight: 300;
          font-style: italic;
          letter-spacing: -0.01em;
          color: var(--text);
          text-decoration: none;
          white-space: nowrap;
          flex-shrink: 0;
        }

        /* Center links */
        .nav-links {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          list-style: none;
          margin: 0;
          padding: 0;
        }
        @media (max-width: 768px) { .nav-links { display: none; } }

        .nav-links a {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.82rem;
          font-weight: 400;
          letter-spacing: 0.01em;
          color: var(--text-muted);
          text-decoration: none;
          padding: 0.4rem 0.85rem;
          transition: color 0.2s ease;
        }

        .nav-links a:hover {
          color: var(--lime);
        }

        .nav-links button {
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

.nav-links button:hover {
  color: var(--lime);
}

.nav-links button.active {
  color: var(--lime);
  font-weight: 500;
}

        /* Right buttons */
        .nav-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-shrink: 0;
        }
        @media (max-width: 768px) { .nav-actions { display: none; } }

        .btn-portal {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.78rem;
          font-weight: 400;
          letter-spacing: 0.02em;
          color: var(--text-muted);
          background: transparent;
          border: 1px solid rgba(200,230,76,0.35);
          border-radius: 6px;
          padding: 0.4rem 1.1rem;
          text-decoration: none;
          cursor: pointer;
          transition: color 0.15s ease, border-color 0.15s ease;
          display: inline-block;
        }

        .btn-portal:hover {
          color: var(--text);
          border-color: var(--lime);
        }

        .btn-register {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.78rem;
          font-weight: 500;
          letter-spacing: 0.01em;
          color: #1e2216;
          background: var(--lime);
          border: none;
          border-radius: 6px;
          padding: 0.45rem 1.2rem;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.15s ease;
          display: inline-block;
        }

        .btn-register:hover {
          background: #d6f05a;
        }

        .user-chip {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .user-avatar {
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

        .user-email {
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        .btn-logout {
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

        .btn-logout:hover {
          color: #b3261e;
        }

        /* Mobile hamburger */
        .hamburger {
          display: none;
          flex-direction: column;
          gap: 5px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
        }
        @media (max-width: 768px) { .hamburger { display: flex; } }

        .hamburger span {
          display: block;
          width: 22px;
          height: 1.5px;
          background: var(--text);
          border-radius: 2px;
          transition: all 0.25s ease;
        }

        .hamburger.open span:nth-child(1) {
          transform: translateY(6px) rotate(45deg);
        }
        .hamburger.open span:nth-child(2) {
          opacity: 0;
        }
        .hamburger.open span:nth-child(3) {
          transform: translateY(-6px) rotate(-45deg);
        }

        /* Mobile drawer */
        .mobile-menu {
          display: none;
          position: fixed;
          top: 64px;
          left: 0;
          right: 0;
          flex-direction: column;
          background: var(--bg);
          border-top: 1px solid var(--border);
          padding: 1rem 1.5rem 1.5rem;
          gap: 0.25rem;
          z-index: 99;
        }

        .mobile-menu.open { display: flex; }

        .mobile-menu a,
        .mobile-menu button {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem;
          font-weight: 400;
          color: var(--text-muted);
          text-decoration: none;
          background: transparent;
          border: none;
          text-align: left;
          padding: 0.6rem 0.75rem;
          border-radius: 8px;
          transition: color 0.15s ease;
          cursor: pointer;
        }

        .mobile-menu a:hover,
        .mobile-menu button:hover { color: var(--lime); }

        .mobile-actions {
          display: flex;
          gap: 0.75rem;
          padding-top: 0.5rem;
          margin-top: 0.5rem;
          border-top: 1px solid var(--border);
        }
      `}</style>

      <div className="nav-root">
        <nav className="nav-bar">
          {/* Brand */}
          <Link href={user ? '/dashboard' : '/'} className="nav-brand">
            E-Invoice
          </Link>

          {/* Center nav links — swap based on login state */}
          <ul className="nav-links">
            {user ? (
              loggedInLinks.map((item) => (
                <li key={item.path}>
                  <button
                    className={isActive(item.path) ? 'active' : ''}
                    onClick={() => router.push(item.path)}
                  >
                    {item.label}
                  </button>
                </li>
              ))
            ) : (
              <>
                <li><Link href="/">Home</Link></li>
                <li><Link href="/features">Features</Link></li>
                <li><Link href="/pricing">Pricing</Link></li>
                <li><Link href="/contact">Contact</Link></li>
              </>
            )}
          </ul>

          {/* Right side — swap based on login state */}
          <div className="nav-actions">
            {user ? (
              <div className="user-chip">
                <div className="user-avatar">{user.email?.[0]?.toUpperCase()}</div>
                <span className="user-email">{user.email}</span>
                <button className="btn-logout" onClick={handleLogout}>Logout</button>
              </div>
            ) : (
              <>
                <Link href="/login" className="btn-portal">CA Portal</Link>
                <Link href="/register" className="btn-register">Register</Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className={`hamburger${menuOpen ? ' open' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span />
            <span />
            <span />
          </button>
        </nav>

        {/* Mobile drawer — swap based on login state */}
        <div className={`mobile-menu${menuOpen ? ' open' : ''}`}>
          {user ? (
            <>
              {loggedInLinks.map((item) => (
                <button
                  key={item.path}
                  onClick={() => { router.push(item.path); setMenuOpen(false); }}
                >
                  {item.label}
                </button>
              ))}
              <div className="mobile-actions">
                <button className="btn-logout" onClick={() => { handleLogout(); setMenuOpen(false); }}>
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link href="/" onClick={() => setMenuOpen(false)}>Home</Link>
              <Link href="/features" onClick={() => setMenuOpen(false)}>Features</Link>
              <Link href="/pricing" onClick={() => setMenuOpen(false)}>Pricing</Link>
              <Link href="/contact" onClick={() => setMenuOpen(false)}>Contact</Link>
              <div className="mobile-actions">
                <Link href="/login" className="btn-portal" onClick={() => setMenuOpen(false)}>CA Portal</Link>
                <Link href="/register" className="btn-register" onClick={() => setMenuOpen(false)}>Register</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}