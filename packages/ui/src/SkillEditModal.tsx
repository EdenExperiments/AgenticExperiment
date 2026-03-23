'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface SkillEditModalProps {
  skillId: string
  skillName: string
  skillDescription: string
  isOpen: boolean
  onClose: () => void
  onUpdate: (name: string, description: string) => Promise<void>
}

export function SkillEditModal({
  skillId: _skillId,
  skillName,
  skillDescription,
  isOpen,
  onClose,
  onUpdate,
}: SkillEditModalProps) {
  const [name, setName] = useState(skillName)
  const [description, setDescription] = useState(skillDescription)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const triggerRef = useRef<HTMLElement | null>(null)
  const firstFocusRef = useRef<HTMLInputElement | null>(null)
  const modalRef = useRef<HTMLDivElement | null>(null)

  // Capture the element that triggered the modal open so focus can be returned
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement
      // Reset form to current values
      setName(skillName)
      setDescription(skillDescription)
      setError(null)
      // Focus the first input after mount
      setTimeout(() => {
        firstFocusRef.current?.focus()
      }, 0)
    } else {
      // Return focus to trigger on close
      triggerRef.current?.focus()
      triggerRef.current = null
    }
  }, [isOpen, skillName, skillDescription])

  // ESC key closes
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      // Focus trap — keep Tab key within the modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const focusableArray = Array.from(focusable).filter(
          (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1
        )
        if (focusableArray.length === 0) return

        const first = focusableArray[0]
        const last = focusableArray[focusableArray.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    },
    [isOpen, onClose]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setIsSubmitting(true)
    setError(null)
    try {
      await onUpdate(name.trim(), description.trim())
      onClose()
    } catch {
      setError('Failed to update skill. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Modal — desktop: centred; mobile: bottom sheet */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-modal-heading"
        className="modal fixed bottom-0 inset-x-0 z-50 rounded-t-3xl p-6 safe-area-inset-bottom
                   md:bottom-auto md:inset-x-auto md:top-1/2 md:-translate-y-1/2
                   md:left-[calc(50%+8rem)] md:-translate-x-1/2
                   md:w-[480px] md:rounded-2xl"
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Heading */}
        <h2
          id="edit-modal-heading"
          className="text-lg font-semibold mb-5"
          style={{
            fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
            color: 'var(--color-text)',
          }}
        >
          Edit Skill
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name field */}
          <div>
            <label
              htmlFor="edit-skill-name"
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Skill name <span aria-hidden="true">*</span>
            </label>
            <input
              ref={firstFocusRef}
              id="edit-skill-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={60}
              placeholder="Skill name"
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          {/* Description field */}
          <div>
            <label
              htmlFor="edit-skill-description"
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Description
            </label>
            <textarea
              id="edit-skill-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={400}
              rows={3}
              placeholder="Description (optional)"
              className="w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          {/* Inline error message */}
          {error && (
            <p
              role="alert"
              className="text-sm rounded-lg px-3 py-2"
              style={{ color: 'var(--color-error)', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
            >
              {error}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-3 pt-1">
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                minHeight: 'var(--tap-target-min, 44px)',
                padding: '12px 16px',
              }}
            >
              {isSubmitting ? 'Saving…' : 'Update Skill'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-ghost w-full disabled:opacity-50"
              style={{
                minHeight: 'var(--tap-target-min, 44px)',
                padding: '10px 16px',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
