'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function AuthForms() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // ---- Login state ----
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // ---- Register state ----
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('BUSINESS')
  const [referralCode, setReferralCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // ---- Forgot / reset password modal state ----
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetStep, setResetStep] = useState<'request' | 'code' | 'done'>('request')
  const [resetEmail, setResetEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetConfirmPassword, setResetConfirmPassword] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  const openResetModal = () => {
    setResetEmail(loginEmail) // reuse whatever was typed on the login side
    setResetStep('request')
    setResetError('')
    setShowResetModal(true)
  }

  const closeResetModal = () => {
    setShowResetModal(false)
    setResetCode('')
    setResetNewPassword('')
    setResetConfirmPassword('')
    setResetError('')
  }

  const handleSendResetCode = async () => {
    setResetError('')
    if (!resetEmail) {
      setResetError('Enter your email address')
      return
    }
    setResetLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      })
      const data = await res.json()
      if (data.success) {
        setResetStep('code')
      } else {
        setResetError(data.message || 'Could not send reset code')
      }
    } catch {
      setResetError('Cannot connect to server')
    } finally {
      setResetLoading(false)
    }
  }

  const handleConfirmReset = async () => {
    setResetError('')
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError('Passwords do not match')
      return
    }
    if (resetNewPassword.length < 8) {
      setResetError('Password must be at least 8 characters')
      return
    }
    setResetLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetCode, newPassword: resetNewPassword })
      })
      const data = await res.json()
      if (data.success) {
        setResetStep('done')
        setLoginEmail(resetEmail)
        setTimeout(() => closeResetModal(), 2000)
      } else {
        setResetError(data.message || 'Reset failed')
      }
    } catch {
      setResetError('Cannot connect to server')
    } finally {
      setResetLoading(false)
    }
  }

  useEffect(() => {
    // Auto-fill referral code from URL ?ref=ABC123
    const ref = searchParams.get('ref')
    if (ref) setReferralCode(ref)
  }, [searchParams])

  const handleLogin = async () => {
    setLoginError('')
    setLoginLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem('token', data.data.token)
        localStorage.setItem('user', JSON.stringify(data.data.user))

        const userRole = data.data.user.role
        if (userRole === 'SUPER_ADMIN') {
          router.push('/system-admin')
        } else if (userRole === 'CA_PARTNER') {
          router.push('/ca')
        } else {
          router.push('/invoices')
        }
      } else {
        setLoginError(data.message || 'Login failed')
      }
    } catch {
      setLoginError('Cannot connect to server')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleRegister = async () => {
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      const body: any = { email, password, role }

      // Only send referralCode if role is BUSINESS and code exists
      if (role === 'BUSINESS' && referralCode.trim()) {
        body.referralCode = referralCode.trim()
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (data.success) {
        localStorage.setItem('token', data.data.token)
        localStorage.setItem('user', JSON.stringify(data.data.user))

        const userRole = data.data.user.role
        if (userRole === 'SUPER_ADMIN') {
          router.push('/system-admin')
        } else if (userRole === 'CA_PARTNER') {
          router.push('/ca')
        } else {
          router.push('/invoices')
        }
      } else {
        setError(data.message || 'Registration failed')
      }
    } catch (err) {
      setError('Cannot connect to server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-[1fr_1px_1fr] gap-8 md:gap-0">

        {/* ── LEFT: Login ── */}
        <div className="bg-surface rounded-2xl md:rounded-r-none p-8 border border-border">
          <h2 className="text-xl font-semibold text-heading mb-1">Sign in to your account</h2>
          <p className="text-muted text-sm mb-6">Welcome back — enter your details below.</p>

          {loginError && (
            <div className="bg-error-bg border border-error-border text-error-text px-4 py-3 rounded-lg mb-4 text-sm">
              {loginError}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm text-muted mb-2">Email Address</label>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-surface-alt border border-border text-heading rounded-lg px-4 py-3 focus:outline-none focus:border-accent transition"
            />
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm text-muted">Password</label>
              <button
                type="button"
                onClick={openResetModal}
                className="text-sm text-link hover:opacity-70"
              >
                Forgot?
              </button>
            </div>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-surface-alt border border-border text-heading rounded-lg px-4 py-3 focus:outline-none focus:border-accent transition"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loginLoading}
            className="w-full bg-btn-dark hover:bg-btn-dark-hover disabled:bg-border-light disabled:text-muted text-btn-dark-text font-semibold py-3 rounded-lg transition"
          >
            {loginLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>

        {/* Vertical divider */}
        <div className="hidden md:block bg-border" />

        {/* ── RIGHT: Register ── */}
        <div className="bg-surface rounded-2xl md:rounded-l-none p-8 border border-border">
          <h2 className="text-xl font-semibold text-heading mb-1">Create your account</h2>
          <p className="text-muted text-sm mb-6">Get started in just a few steps.</p>

          {error && (
            <div className="bg-error-bg border border-error-border text-error-text px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm text-muted mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-surface-alt border border-border text-heading rounded-lg px-4 py-3 focus:outline-none focus:border-accent transition"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm text-muted mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="w-full bg-surface-alt border border-border text-heading rounded-lg px-4 py-3 focus:outline-none focus:border-accent transition"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm text-muted mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              className="w-full bg-surface-alt border border-border text-heading rounded-lg px-4 py-3 focus:outline-none focus:border-accent transition"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm text-muted mb-2">Account Type</label>
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value)
                // Clear referral code if switching to CA
                if (e.target.value === 'CA_PARTNER') setReferralCode('')
              }}
              className="w-full bg-surface-alt border border-border text-heading rounded-lg px-4 py-3 focus:outline-none focus:border-accent transition"
            >
              <option value="BUSINESS">Business Owner</option>
              <option value="CA_PARTNER">Chartered Accountant</option>
            </select>
          </div>

          {/* Referral Code field — only show for Business */}
          {role === 'BUSINESS' && (
            <div className="mb-6">
              <label className="block text-sm text-muted mb-2">
                Referral Code <span className="text-muted-dark">(optional)</span>
              </label>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="e.g. ABC123"
                className="w-full bg-surface-alt border border-border text-heading rounded-lg px-4 py-3 focus:outline-none focus:border-accent transition font-mono tracking-widest"
              />
              {referralCode && (
                <p className="text-success-text text-xs mt-1">
                  ✓ You will be linked to a CA partner
                </p>
              )}
            </div>
          )}

          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-btn-dark hover:bg-btn-dark-hover disabled:bg-border-light disabled:text-muted text-btn-dark-text font-semibold py-3 rounded-lg transition"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </div>
      </div>

      {/* Forgot / reset password modal */}
      {showResetModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50"
          onClick={closeResetModal}
        >
          <div
            className="w-full max-w-md bg-surface border border-border rounded-2xl p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xl font-semibold text-heading">
                {resetStep === 'done' ? 'Password Reset!' : 'Reset Password'}
              </h3>
              <button
                type="button"
                onClick={closeResetModal}
                className="text-muted hover:text-heading text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {resetStep === 'request' && (
              <>
                <p className="text-muted text-sm mb-6">
                  We'll send a reset code to this email.
                </p>
                {resetError && (
                  <div className="bg-error-bg border border-error-border text-error-text px-4 py-3 rounded-lg mb-4 text-sm">
                    {resetError}
                  </div>
                )}
                <div className="mb-6">
                  <label className="block text-sm text-muted mb-2">Email Address</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-surface-alt border border-border text-heading rounded-lg px-4 py-3 focus:outline-none focus:border-accent transition"
                  />
                </div>
                <button
                  onClick={handleSendResetCode}
                  disabled={resetLoading}
                  className="w-full bg-btn-dark hover:bg-btn-dark-hover disabled:bg-border-light disabled:text-muted text-btn-dark-text font-semibold py-3 rounded-lg transition"
                >
                  {resetLoading ? 'Sending...' : 'Send Reset Code'}
                </button>
              </>
            )}

            {resetStep === 'code' && (
              <>
                <p className="text-muted text-sm mb-6">
                  Check <span className="text-heading">{resetEmail}</span> for a reset code, paste it below, and choose a new password.
                </p>
                {resetError && (
                  <div className="bg-error-bg border border-error-border text-error-text px-4 py-3 rounded-lg mb-4 text-sm">
                    {resetError}
                  </div>
                )}
                <div className="mb-4">
                  <label className="block text-sm text-muted mb-2">Reset Code</label>
                  <input
                    type="text"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="Paste the code from your email"
                    className="w-full bg-surface-alt border border-border text-heading rounded-lg px-4 py-3 focus:outline-none focus:border-accent transition font-mono text-xs"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm text-muted mb-2">New Password</label>
                  <input
                    type="password"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full bg-surface-alt border border-border text-heading rounded-lg px-4 py-3 focus:outline-none focus:border-accent transition"
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm text-muted mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full bg-surface-alt border border-border text-heading rounded-lg px-4 py-3 focus:outline-none focus:border-accent transition"
                  />
                </div>
                <button
                  onClick={handleConfirmReset}
                  disabled={resetLoading}
                  className="w-full bg-btn-dark hover:bg-btn-dark-hover disabled:bg-border-light disabled:text-muted text-btn-dark-text font-semibold py-3 rounded-lg transition"
                >
                  {resetLoading ? 'Resetting...' : 'Reset Password'}
                </button>
                <button
                  type="button"
                  onClick={handleSendResetCode}
                  disabled={resetLoading}
                  className="w-full text-muted hover:text-heading text-sm mt-4"
                >
                  Resend code
                </button>
              </>
            )}

            {resetStep === 'done' && (
              <div className="text-center pt-4">
                <div className="text-success-text text-5xl mb-4">✓</div>
                <p className="text-muted">Your password has been reset. You can now sign in.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-heading">Loading...</div>}>
      <AuthForms />
    </Suspense>
  )
}