'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [business, setBusiness] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [fbrLoading, setFbrLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fbrError, setFbrError] = useState('')
  const [fbrSuccess, setFbrSuccess] = useState('')
  const [editMode, setEditMode] = useState(false)

  const [formData, setFormData] = useState({
    businessName: '',
    ntn: '',
    strn: '',
    address: '',
    city: '',
    phone: '',
    businessType: '',
  })

  const [fbrData, setFbrData] = useState({
    securityToken: '',
    posId: ''
  })

  useEffect(() => {
    const userData = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (!userData || !token) {
      router.push('/login')
      return
    }
    setUser(JSON.parse(userData))
    fetchBusinessProfile(token)
  }, [])

  const fetchBusinessProfile = async (token: string) => {
    try {
      const res = await fetch('http://localhost:5000/api/business/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.status === 404) return

      const data = await res.json()

      if (data.success && data.data) {
        setBusiness(data.data)
        setFormData({
          businessName: data.data.businessName  || '',
          ntn:          data.data.ntn           || '',
          strn:         data.data.strn          || '',
          address:      data.data.address       || '',
          city:         data.data.city          || '',
          phone:        data.data.phone         || '',
          businessType: data.data.businessType  || '',
        })
        setFbrData({
          securityToken: data.data.securityToken || '',
          posId:         data.data.posId         || ''
        })
      }
    } catch (err) {
      console.log('Could not load business profile')
    }
  }

  const handleInputChange = (e: any) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFbrInputChange = (e: any) => {
    const { name, value } = e.target
    setFbrData(prev => ({ ...prev, [name]: value }))
  }

  // ── Create or Update basic business profile ──────────────────────────────
  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!formData.businessName || !formData.ntn || !formData.strn ||
        !formData.address || !formData.city || !formData.phone || !formData.businessType) {
      setError('Please fill in all required fields')
      setLoading(false)
      return
    }

    if (!/^\d{7}$/.test(formData.ntn)) {
      setError('NTN must be exactly 7 digits')
      setLoading(false)
      return
    }

    if (!/^\d{11}$/.test(formData.strn)) {
      setError('STRN must be exactly 11 digits')
      setLoading(false)
      return
    }

    try {
      const token = localStorage.getItem('token')
      const method = business ? 'PUT' : 'POST'

      const res = await fetch('http://localhost:5000/api/business/profile', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (data.success) {
        setSuccess(business ? 'Business profile updated!' : 'Business profile created!')
        setBusiness(data.data)
        setEditMode(false)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Failed to save')
      }
    } catch (err) {
      setError('Cannot connect to server')
    } finally {
      setLoading(false)
    }
  }

  // ── Update FBR token only ─────────────────────────────────────────────────
  const handleFbrSubmit = async (e: any) => {
    e.preventDefault()
    setFbrLoading(true)
    setFbrError('')
    setFbrSuccess('')

    if (!fbrData.securityToken) {
      setFbrError('Security token is required')
      setFbrLoading(false)
      return
    }

    try {
      const token = localStorage.getItem('token')

      const res = await fetch('http://localhost:5000/api/business/fbr-token', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(fbrData)
      })

      const data = await res.json()

      if (data.success) {
        setFbrSuccess('FBR configuration saved!')
        setBusiness((prev: any) => ({ ...prev, ...fbrData }))
        setTimeout(() => setFbrSuccess(''), 3000)
      } else {
        setFbrError(data.message || 'Failed to save FBR config')
      }
    } catch (err) {
      setFbrError('Cannot connect to server')
    } finally {
      setFbrLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Business Profile</h1>
          <p className="text-gray-400">Manage your business details and FBR configuration</p>
        </div>

        {/* Account Information */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6 border border-gray-800">
          <h2 className="text-lg font-semibold mb-4">Account Information</h2>
          <p className="text-gray-300">Email: <span className="font-mono text-blue-400">{user?.email}</span></p>
          <p className="text-gray-300">Role: <span className="font-mono text-blue-400">{user?.role}</span></p>
        </div>

        {/* ── SECTION 1: Business Profile ───────────────────────────────── */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-semibold">
                {business ? 'Business Details' : 'Setup Your Business'}
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                {business ? 'Your registered business information' : 'Enter your business details to get started'}
              </p>
            </div>
            {business && !editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                Edit
              </button>
            )}
          </div>

          {/* Success / Error */}
          {success && (
            <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg mb-4">
              ✓ {success}
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-4">
              ✕ {error}
            </div>
          )}

          {business && !editMode ? (
            // ── Display Mode ──────────────────────────────────────────────
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Business Name</p>
                <p className="text-white font-semibold">{business.businessName}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Business Type</p>
                <p className="text-white font-semibold">{business.businessType}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">NTN</p>
                <p className="text-white font-mono">{business.ntn}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">STRN</p>
                <p className="text-white font-mono">{business.strn}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-400 text-sm">Address</p>
                <p className="text-white">{business.address}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">City</p>
                <p className="text-white">{business.city}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Phone</p>
                <p className="text-white">{business.phone}</p>
              </div>
            </div>
          ) : (
            // ── Create / Edit Mode ────────────────────────────────────────
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">

                <div className="col-span-2">
                  <label className="block text-sm text-gray-400 mb-2">Business Name *</label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    placeholder="Your Company Name"
                    required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Business Type *</label>
                  <select
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition"
                  >
                    <option value="">Select Type</option>
                    <option value="Retail">Retail</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Services">Services</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">NTN (7 digits) *</label>
                  <input
                    type="text"
                    name="ntn"
                    value={formData.ntn}
                    onChange={handleInputChange}
                    placeholder="1234567"
                    pattern="\d{7}"
                    required
                    disabled={!!business}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {business && (
                    <p className="text-xs text-gray-500 mt-1">NTN cannot be changed after registration</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">STRN (11 digits) *</label>
                  <input
                    type="text"
                    name="strn"
                    value={formData.strn}
                    onChange={handleInputChange}
                    placeholder="12345678901"
                    pattern="\d{11}"
                    required
                    disabled={!!business}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {business && (
                    <p className="text-xs text-gray-500 mt-1">STRN cannot be changed after registration</p>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="block text-sm text-gray-400 mb-2">Address *</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Street Address"
                    required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">City *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Karachi"
                    required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Phone *</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="03001234567"
                    required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-2 rounded-lg transition"
                >
                  {loading ? 'Saving...' : (business ? 'Update Profile' : 'Create Profile')}
                </button>
                {editMode && (
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 rounded-lg transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* ── SECTION 2: FBR Configuration ──────────────────────────────── */}
        {business && (
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">FBR Configuration</h2>
                <p className="text-gray-400 text-sm mt-1">
                  POS credentials from FBR IRIS portal
                </p>
              </div>
              {/* Whitelisting badge */}
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                business.isWhitelisted
                  ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                  : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${business.isWhitelisted ? 'bg-green-500' : 'bg-yellow-500'}`} />
                {business.isWhitelisted ? 'Whitelisted' : 'Not Whitelisted'}
              </div>
            </div>

            {/* FBR Success / Error */}
            {fbrSuccess && (
              <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg mb-4">
                ✓ {fbrSuccess}
              </div>
            )}
            {fbrError && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-4">
                ✕ {fbrError}
              </div>
            )}

            <form onSubmit={handleFbrSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  FBR Security Token *
                </label>
                <input
                  type="password"
                  name="securityToken"
                  value={fbrData.securityToken}
                  onChange={handleFbrInputChange}
                  placeholder="Paste your token from FBR IRIS"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get this from FBR IRIS portal → POS Integration → Security Token
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">POS ID</label>
                <input
                  type="text"
                  name="posId"
                  value={fbrData.posId}
                  onChange={handleFbrInputChange}
                  placeholder="e.g. POS001"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Point of Sale identifier assigned by FBR
                </p>
              </div>

              <button
                type="submit"
                disabled={fbrLoading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-semibold py-2 rounded-lg transition"
              >
                {fbrLoading ? 'Saving...' : 'Save FBR Configuration'}
              </button>
            </form>
          </div>
        )}

        {/* ── SECTION 3: Help ───────────────────────────────────────────── */}
        <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-400 mb-4">Need Help?</h3>
          <ul className="text-gray-300 space-y-2 text-sm">
            <li>• <strong>NTN:</strong> 7-digit National Tax Number from FBR IRIS</li>
            <li>• <strong>STRN:</strong> 11-digit Sales Tax Registration Number</li>
            <li>• <strong>Security Token:</strong> From FBR IRIS after POS registration</li>
            <li>• <strong>POS ID:</strong> Point of Sale identifier assigned by FBR</li>
          </ul>
        </div>

      </div>
    </div>
  )
}