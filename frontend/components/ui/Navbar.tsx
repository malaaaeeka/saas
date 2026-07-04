'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        .nav-root {
          --bg: #1e2216;
          --lime: #c8e64c;
          --text: #f0edd8;
          --text-muted: #9a9a7e;
          --border: rgba(200,230,76,0.15);
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

        .mobile-menu a {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem;
          font-weight: 400;
          color: var(--text-muted);
          text-decoration: none;
          padding: 0.6rem 0.75rem;
          border-radius: 8px;
          transition: color 0.15s ease;
        }

        .mobile-menu a:hover { color: var(--lime); }

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
          <Link href="/" className="nav-brand">
            E-Invoice
          </Link>

          {/* Center nav links */}
          <ul className="nav-links">
            <li><Link href="/">Home</Link></li>
            <li><Link href="/features">Features</Link></li>
            <li><Link href="/pricing">Pricing</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>

          {/* Right buttons */}
          <div className="nav-actions">
            <Link href="/login" className="btn-portal">CA Portal</Link>
            <Link href="/register" className="btn-register">Register</Link>
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

        {/* Mobile drawer */}
        <div className={`mobile-menu${menuOpen ? ' open' : ''}`}>
          <Link href="/" onClick={() => setMenuOpen(false)}>Home</Link>
          <Link href="/features" onClick={() => setMenuOpen(false)}>Features</Link>
          <Link href="/pricing" onClick={() => setMenuOpen(false)}>Pricing</Link>
          <Link href="/contact" onClick={() => setMenuOpen(false)}>Contact</Link>
          <div className="mobile-actions">
            <Link href="/login" className="btn-portal" onClick={() => setMenuOpen(false)}>CA Portal</Link>
            <Link href="/register" className="btn-register" onClick={() => setMenuOpen(false)}>Register</Link>
          </div>
        </div>
      </div>
    </>
  );
}