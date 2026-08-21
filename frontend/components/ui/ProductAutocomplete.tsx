'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface ProductResult {
  id: string
  description: string
  hsCode: string | null
  hsCodeDescription: string | null
  uom: string | null
  rate: number | null
  taxRate: string | null
  sroSchedule: string | null
  itemSNo: string | null
}

interface Props {
  value: string
  onSelect: (product: ProductResult | null) => void
  onTextChange?: (text: string) => void
}

export default function ProductAutocomplete({ value, onSelect, onTextChange }: Props) {
  const [query, setQuery]     = useState(value || '')
  const [results, setResults] = useState<ProductResult[]>([])
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef           = useRef<NodeJS.Timeout | null>(null)
  const containerRef          = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(value || '')
  }, [value])

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
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/products/search?q=${encodeURIComponent(q)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      if (data.success) {
        setResults(data.data || [])
        setOpen(true)
      }
    } catch {
      // silent — product autocomplete is a convenience, not required
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    onSelect(null)
    onTextChange?.(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 300)
  }

  const handleSelectItem = (item: ProductResult) => {
    setQuery(item.description)
    setOpen(false)
    onSelect(item)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Product name"
        className="w-full bg-surface border border-border text-heading rounded px-3 py-1 text-sm focus:outline-none focus:border-accent"
      />

      {loading && (
        <div className="absolute z-50 w-full bg-surface border border-border rounded mt-1 px-3 py-2 text-xs text-muted">
          Searching...
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
              <div className="font-medium">{item.description}</div>
              <div className="text-xs text-muted">
                {item.hsCode || 'No HS code'} · {item.rate ? `PKR ${item.rate}` : 'No rate saved'}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}