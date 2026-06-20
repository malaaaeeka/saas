'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ReferralsPage() {
  const router = useRouter()
  const [caProfile, setCaProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    if (!token || !user) { router.push('/login'); return }
    const userData = JSON.parse(user)
    if (userData.role !== 'CA_PARTNER') { router.push('/login'); return }
    fetchProfile(token)
  }, [])

  const fetchProfile = async (token: string) => {
    try {
      const res = await fetch('http://localhost:5000/api/ca/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const json = await res.json()
      if (json.success) setCaProfile(json.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const referralLink = caProfile?.referralCode
    ? `http://localhost:3000/register?ref=${caProfile.referralCode}`
    : 'Loading...'

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <p className="text-gray-400">Loading...</p>

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Referrals</h1>
      <p className="text-gray-400 mb-8">Share your referral link to get clients</p>

      {/* Referral Code Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Your Referral Link</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-4 py-3 text-sm text-gray-300"
          />
          <button
            onClick={copyLink}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded font-medium transition"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-gray-500 text-sm mt-3">
          Share this link with businesses. When they register using your link, they become your client automatically.
        </p>
      </div>

      {/* Referral Code separately */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-2">Your Referral Code</h2>
        <p className="text-4xl font-mono font-bold text-blue-400 tracking-widest">
          {caProfile?.referralCode || 'N/A'}
        </p>
        <p className="text-gray-500 text-sm mt-2">
          Businesses can also manually enter this code during registration.
        </p>
      </div>

      {/* How it works */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">How It Works</h2>
        <div className="space-y-4">
          {[
            { step: '1', text: 'Copy your referral link above' },
            { step: '2', text: 'Share it with businesses via WhatsApp, email, etc.' },
            { step: '3', text: 'Business clicks link and registers — they are auto-linked to you' },
            { step: '4', text: 'When they create invoices, you earn your commission automatically' },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-4">
              <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {item.step}
              </span>
              <p className="text-gray-300">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}