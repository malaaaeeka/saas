'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface HsCodeResult {
  code: string
  description: string
  fullEntry: string
}

interface Props {
  value: string
  onSelect: (code: string, description: string, fullEntry: string) => void
}

export default function HsCodeAutocomplete({ value, onSelect }: Props) {
  const [query, setQuery]       = useState(value || '')
  const [results, setResults]   = useState<HsCodeResult[]>([])
  const [open, setOpen]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const debounceRef             = useRef<NodeJS.Timeout | null>(null)
  const containerRef            = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setOpen(false); return }

    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(
        `http://localhost:5000/api/hs-codes/search?q=${encodeURIComponent(q)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      if (data.success) {
        setResults(data.data || [])
        setOpen(true)
      } else {
        setError('Search failed')
      }
    } catch {
      setError('Cannot reach server')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    // Debounce — wait 300ms after user stops typing before calling API
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 300)
  }

  const handleSelect = (item: HsCodeResult) => {
    setQuery(item.fullEntry)
    setOpen(false)
    onSelect(item.code, item.description, item.fullEntry)
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setOpen(false)
    onSelect('', '', '')
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Type HS code or keyword to search..."
          className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-1 pr-8 text-sm focus:outline-none focus:border-blue-500"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {loading && (
        <div className="absolute z-50 w-full bg-gray-800 border border-gray-600 rounded mt-1 px-3 py-2 text-sm text-gray-400">
          Searching...
        </div>
      )}

      {error && (
        <div className="absolute z-50 w-full bg-gray-800 border border-red-600 rounded mt-1 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {open && !loading && results.length > 0 && (
        <ul className="absolute z-50 w-full bg-gray-800 border border-gray-600 rounded mt-1 max-h-48 overflow-y-auto text-sm shadow-lg">
          {results.map((item) => (
            <li
              key={item.fullEntry}
              onMouseDown={() => handleSelect(item)}
              className="px-3 py-2 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0"
            >
              <span className="text-blue-400 font-mono text-xs">{item.code}</span>
              {item.description && (
                <span className="text-gray-300 ml-2">{item.description}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {open && !loading && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 w-full bg-gray-800 border border-gray-600 rounded mt-1 px-3 py-2 text-sm text-gray-400">
          No HS codes found for &quot;{query}&quot;
        </div>
      )}
    </div>
  )
}