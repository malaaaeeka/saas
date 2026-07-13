'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface BuyerResult {
  id: string
  buyerName: string
  buyerNtn: string | null
  buyerCnic: string | null
  address: string | null
  phone: string | null
  email: string | null
}

interface Props {
  value: string
  onSelect: (buyer: BuyerResult | null) => void
  onTextChange?: (text: string) => void
}

export default function ClientAutocomplete({ value, onSelect, onTextChange }: Props) {
  const [query, setQuery]       = useState(value || '')
  const [results, setResults]   = useState<BuyerResult[]>([])
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/buyers/search?q=${encodeURIComponent(q)}`,
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
    onSelect(null) // clear any previously selected buyer once user edits the text
    onTextChange?.(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 300)
  }

  const handleSelectItem = (item: BuyerResult) => {
    setQuery(item.buyerName)
    setOpen(false)
    onSelect(item)
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setOpen(false)
    onSelect(null)
    onTextChange?.('')
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Type buyer name, NTN, or CNIC to search..."
          className="w-full bg-surface border border-border text-heading rounded px-3 py-1 pr-8 text-sm focus:outline-none focus:border-accent"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-heading text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {loading && (
        <div className="absolute z-50 w-full bg-surface border border-border rounded mt-1 px-3 py-2 text-sm text-muted">
          Searching...
        </div>
      )}

      {error && (
        <div className="absolute z-50 w-full bg-surface border border-error-border rounded mt-1 px-3 py-2 text-sm text-error-text">
          {error}
        </div>
      )}

      {open && !loading && results.length > 0 && (
        <ul className="absolute z-50 w-full bg-surface border border-border rounded mt-1 max-h-48 overflow-y-auto text-sm shadow-lg">
          {results.map((item) => (
            <li
              key={item.id}
              onMouseDown={() => handleSelectItem(item)}
              className="px-3 py-2 hover:bg-border-light cursor-pointer border-b border-border last:border-0 text-body"
            >
              <div className="font-medium">{item.buyerName}</div>
              <div className="text-xs text-muted">
                {item.buyerNtn || item.buyerCnic || 'No NTN/CNIC on file'}
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && !loading && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 w-full bg-surface border border-border rounded mt-1 px-3 py-2 text-sm text-muted">
          No saved buyers found for &quot;{query}&quot; — it will be saved as new.
        </div>
      )}
    </div>
  )
}