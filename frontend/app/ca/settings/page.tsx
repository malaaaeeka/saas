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
      <p className="text-gray-400 mb-8">Manage your CA profile</p>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-5">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Email</label>
          <input
            type="text"
            value={user?.email || ''}
            readOnly
            className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-3 text-gray-400 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-2">Firm Name</label>
          <input
            type="text"
            value={firmName}
            onChange={(e) => setFirmName(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-3 text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-2">ICAP Number</label>
          <input
            type="text"
            value={icapNumber}
            onChange={(e) => setIcapNumber(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-3 text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={handleSave}
          className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded font-medium transition"
        >
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}