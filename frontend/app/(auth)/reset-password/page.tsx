'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleReset = async () => {
    if (newPassword !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(true)
        setTimeout(() => router.push('/login'), 3000)
      } else {
        setError(data.message || 'Reset failed')
      }
    } catch {
      setError('Cannot connect to server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-surface rounded-2xl p-8 border border-border">
          {success ? (
            <div className="text-center">
              <div className="text-success-text text-5xl mb-4">✓</div>
              <h2 className="text-xl font-semibold text-heading mb-2">Password Reset!</h2>
              <p className="text-muted">Redirecting to login in 3 seconds...</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-heading mb-6">Set New Password</h2>
              {error && (
                <div className="bg-error-bg border border-error-border text-error-text px-4 py-3 rounded-lg mb-4 text-sm">
                  {error}
                </div>
              )}
              {!token && (
                <div className="bg-warning-bg border border-warning-border text-warning-text px-4 py-3 rounded-lg mb-4 text-sm">
                  This reset link looks incomplete or expired. Request a new one from the login page.
                </div>
              )}
              <div className="mb-4">
                <label className="block text-sm text-muted mb-2">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full bg-surface-alt border border-border text-heading rounded-lg px-4 py-3 focus:outline-none focus:border-accent transition"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm text-muted mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full bg-surface-alt border border-border text-heading rounded-lg px-4 py-3 focus:outline-none focus:border-accent transition"
                />
              </div>
              <button
                onClick={handleReset}
                disabled={loading || !token}
                className="w-full bg-btn-dark hover:bg-btn-dark-hover disabled:bg-border-light disabled:text-muted text-btn-dark-text font-semibold py-3 rounded-lg transition"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
              <p className="text-center text-muted text-sm mt-6">
                <Link href="/login" className="text-link hover:opacity-70">Back to Login</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-heading">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}