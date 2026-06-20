'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,400&family=Montserrat:wght@300;400;500&display=swap');

        .nav-root {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          transition: background 0.4s ease, backdrop-filter 0.4s ease, box-shadow 0.4s ease;
          background: ${scrolled
            ? 'rgba(10, 8, 6, 0.88)'
            : 'transparent'};
          backdrop-filter: ${scrolled ? 'blur(14px)' : 'none'};
          -webkit-backdrop-filter: ${scrolled ? 'blur(14px)' : 'none'};
          box-shadow: ${scrolled ? '0 1px 0 rgba(180,150,80,0.18)' : 'none'};
        }

        .nav-inner {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 2.5rem;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        /* Brand */
        .nav-brand {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-style: italic;
          font-size: 1.6rem;
          font-weight: 400;
          letter-spacing: 0.04em;
          color: #e8d9b5;
          text-decoration: none;
          white-space: nowrap;
          flex-shrink: 0;
        }

        /* Center links */
        .nav-links {
          display: flex;
          align-items: center;
          gap: 2.8rem;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .nav-links a {
          font-family: 'Montserrat', sans-serif;
          font-size: 0.88rem;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(232, 217, 181, 0.75);
          text-decoration: none;
          position: relative;
          transition: color 0.25s ease;
        }

        .nav-links a::after {
          content: '';
          position: absolute;
          bottom: -3px;
          left: 0;
          right: 0;
          height: 1px;
          background: #c8a84b;
          transform: scaleX(0);
          transition: transform 0.25s ease;
          transform-origin: left;
        }

        .nav-links a:hover {
          color: #e8d9b5;
        }

        .nav-links a:hover::after {
          transform: scaleX(1);
        }

        /* Right buttons */
        .nav-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-shrink: 0;
        }

        .btn-portal {
          font-family: 'Montserrat', sans-serif;
          font-size: 0.78rem;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #e8d9b5;
          background: transparent;
          border: 1px solid rgba(200, 168, 75, 0.6);
          padding: 0.55rem 1.25rem;
          text-decoration: none;
          cursor: pointer;
          transition: border-color 0.25s ease, color 0.25s ease, background 0.25s ease;
        }

        .btn-portal:hover {
          border-color: #c8a84b;
          background: rgba(200, 168, 75, 0.08);
          color: #f0e4c0;
        }

        .btn-register {
          font-family: 'Montserrat', sans-serif;
          font-size: 0.78rem;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #0a0806;
          background: #c8a84b;
          border: 1px solid #c8a84b;
          padding: 0.55rem 1.25rem;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.25s ease, color 0.25s ease;
        }

        .btn-register:hover {
          background: #e8d9b5;
          border-color: #e8d9b5;
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

        .hamburger span {
          display: block;
          width: 22px;
          height: 1px;
          background: #e8d9b5;
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
          flex-direction: column;
          background: rgba(10, 8, 6, 0.97);
          border-top: 1px solid rgba(200, 168, 75, 0.2);
          padding: 1.5rem 2.5rem 2rem;
          gap: 1.5rem;
        }

        .mobile-menu a {
          font-family: 'Montserrat', sans-serif;
          font-size: 0.82rem;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(232, 217, 181, 0.75);
          text-decoration: none;
          transition: color 0.2s;
        }

        .mobile-menu a:hover { color: #e8d9b5; }

        .mobile-actions {
          display: flex;
          gap: 0.75rem;
          padding-top: 0.5rem;
          border-top: 1px solid rgba(200, 168, 75, 0.15);
        }

        @media (max-width: 768px) {
          .nav-links { display: none; }
          .nav-actions { display: none; }
          .hamburger { display: flex; }
          .mobile-menu { display: ${menuOpen ? 'flex' : 'none'}; }
        }
      `}</style>

      <nav className="nav-root">
        <div className="nav-inner">
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
        </div>


        {/* Mobile drawer */}
        <div className="mobile-menu">
          <Link href="/" onClick={() => setMenuOpen(false)}>Home</Link>
          <Link href="/features" onClick={() => setMenuOpen(false)}>Features</Link>
          <Link href="/pricing" onClick={() => setMenuOpen(false)}>Pricing</Link>
          <Link href="/contact" onClick={() => setMenuOpen(false)}>Contact</Link>
          <div className="mobile-actions">
            <Link href="/login" className="btn-portal" onClick={() => setMenuOpen(false)}>CA Portal</Link>
            <Link href="/register" className="btn-register" onClick={() => setMenuOpen(false)}>Register</Link>
          </div>
        </div>
      </nav>
    </>
  );
}