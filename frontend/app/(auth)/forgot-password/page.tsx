'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await res.json()
      if (data.success) {
        setSent(true)
      } else {
        setError(data.message)
      }
    } catch {
      setError('Cannot connect to server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            FBR <span className="text-blue-500">Invoice</span>
          </h1>
          <p className="text-gray-400 mt-2">Digital Invoicing System</p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          {sent ? (
            <div className="text-center">
              <div className="text-green-400 text-5xl mb-4">✓</div>
              <h2 className="text-xl font-semibold text-white mb-2">Email Sent!</h2>
              <p className="text-gray-400 mb-6">Check your inbox for the reset link. It expires in 1 hour.</p>
              <Link href="/login" className="text-blue-400 hover:text-blue-300">Back to Login</Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-white mb-2">Forgot Password</h2>
              <p className="text-gray-400 text-sm mb-6">Enter your email and we will send you a reset link.</p>
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
                  {error}
                </div>
              )}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <p className="text-center text-gray-400 text-sm mt-6">
                Remember your password?{' '}
                <Link href="/login" className="text-blue-400 hover:text-blue-300">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}