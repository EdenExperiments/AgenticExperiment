'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'

export interface TagSuggestInputProps {
  value: string
  onChange: (value: string) => void
  onCommit: (tagName?: string) => void
  suggestions: string[]
  disabled?: boolean
  placeholder?: string
}

export function TagSuggestInput({
  value,
  onChange,
  onCommit,
  suggestions,
  disabled = false,
  placeholder = 'Add a tag...',
}: TagSuggestInputProps) {
  const listId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)

  const query = value.trim().toLowerCase()

  const filtered = useMemo(() => {
    return suggestions
      .filter((name) => !query || name.includes(query))
      .slice(0, 8)
  }, [query, suggestions])

  const canCreate = query.length > 0 && !suggestions.some((name) => name === query)
  const optionCount = filtered.length + (canCreate ? 1 : 0)
  const showMenu = open && !disabled && optionCount > 0

  useEffect(() => {
    setHighlightIndex(0)
  }, [query, filtered.length, canCreate])

  useEffect(() => {
    if (!showMenu) return

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [showMenu])

  function commitSelection(name?: string) {
    onCommit(name)
    setOpen(false)
  }

  function selectOption(index: number) {
    if (index < filtered.length) {
      commitSelection(filtered[index])
      return
    }
    if (canCreate) {
      commitSelection(query)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      if (optionCount > 0) {
        setHighlightIndex((i) => (i + 1) % optionCount)
      }
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      if (optionCount > 0) {
        setHighlightIndex((i) => (i - 1 + optionCount) % optionCount)
      }
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      return
    }

    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      if (showMenu && optionCount > 0) {
        selectOption(highlightIndex)
      } else {
        commitSelection()
      }
      return
    }
  }

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => {
            if (!containerRef.current?.contains(document.activeElement)) {
              if (value.trim()) onCommit()
              setOpen(false)
            }
          }, 0)
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        role="combobox"
        aria-expanded={showMenu}
        aria-controls={showMenu ? listId : undefined}
        aria-autocomplete="list"
        className="w-full rounded-lg px-3 py-2 text-sm border"
        style={{
          fontFamily: 'var(--font-body)',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text)',
          borderColor: 'var(--color-border)',
          minHeight: 'var(--tap-target-min, 44px)',
        }}
      />

      {showMenu && (
        <ul
          id={listId}
          role="listbox"
          className="tag-suggest-menu absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border p-1 shadow-lg"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            borderColor: 'var(--color-border)',
          }}
        >
          {filtered.map((name, index) => (
            <li
              key={name}
              role="option"
              aria-selected={index === highlightIndex}
              className={`tag-suggest-menu__option rounded-md px-3 py-2 text-sm cursor-pointer ${
                index === highlightIndex ? 'tag-suggest-menu__option--active' : ''
              }`}
              style={{ color: 'var(--color-text)' }}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHighlightIndex(index)}
              onClick={() => selectOption(index)}
            >
              {name}
            </li>
          ))}
          {canCreate && (
            <li
              role="option"
              aria-selected={highlightIndex === filtered.length}
              className={`tag-suggest-menu__option rounded-md px-3 py-2 text-sm cursor-pointer ${
                highlightIndex === filtered.length ? 'tag-suggest-menu__option--active' : ''
              }`}
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHighlightIndex(filtered.length)}
              onClick={() => selectOption(filtered.length)}
            >
              Add &ldquo;{query}&rdquo;
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
