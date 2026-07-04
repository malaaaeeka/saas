'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CASettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [firmName, setFirmName] = useState('')
  const [icapNumber, setIcapNumber] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (!token || !userData) { router.push('/login'); return }
    const parsed = JSON.parse(userData)
    if (parsed.role !== 'CA_PARTNER') { router.push('/login'); return }
    setUser(parsed)
    fetchProfile(token)
  }, [])

  const fetchProfile = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ca/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const json = await res.json()
      if (json.success) {
        setFirmName(json.data.firmName || '')
        setIcapNumber(json.data.icapNumber || '')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSave = async () => {
    // For now just show saved — you can add a PUT endpoint later
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-2">Settings</h1>
      <p className="text-muted mb-8">Manage your CA profile</p>

      <div className="bg-surface border border-border rounded-lg p-6 space-y-5">
        <div>
          <label className="block text-sm text-muted mb-2">Email</label>
          <input
            type="text"
            value={user?.email || ''}
            readOnly
            className="w-full bg-surface-alt border border-border rounded px-4 py-3 text-muted cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-sm text-muted mb-2">Firm Name</label>
          <input
            type="text"
            value={firmName}
            onChange={(e) => setFirmName(e.target.value)}
            className="w-full bg-surface-alt border border-border rounded px-4 py-3 text-heading focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-sm text-muted mb-2">ICAP Number</label>
          <input
            type="text"
            value={icapNumber}
            onChange={(e) => setIcapNumber(e.target.value)}
            className="w-full bg-surface-alt border border-border rounded px-4 py-3 text-heading focus:outline-none focus:border-accent"
          />
        </div>
        <button
          onClick={handleSave}
          className="w-full bg-btn-dark hover:bg-btn-dark-hover text-btn-dark-text py-3 rounded font-medium transition"
        >
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}