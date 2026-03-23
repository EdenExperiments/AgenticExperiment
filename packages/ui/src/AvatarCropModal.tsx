'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

const MAX_FILE_SIZE_MB = 5
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const OUTPUT_SIZE = 256

interface AvatarCropModalProps {
  open: boolean
  onClose: () => void
  onUpload: (blob: Blob) => Promise<void>
  isUploading?: boolean
  error?: string | null
}

interface CropState {
  x: number
  y: number
  size: number
}

interface DragState {
  dragging: boolean
  startX: number
  startY: number
  startCropX: number
  startCropY: number
}

/**
 * AvatarCropModal — client-side avatar cropper.
 *
 * - File input with type/size validation before canvas load
 * - Square (1:1) crop box with mouse and touch support
 * - Canvas drawImage → toBlob('image/jpeg', 0.85) at 256×256
 * - Error recovery: modal stays open on upload failure, blob retained
 * - Theme-aware via CSS custom properties
 */
export function AvatarCropModal({ open, onClose, onUpload, isUploading = false, error: externalError = null }: AvatarCropModalProps) {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [crop, setCrop] = useState<CropState>({ x: 0, y: 0, size: 100 })
  const [imageNaturalSize, setImageNaturalSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 })
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewImgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState>({ dragging: false, startX: 0, startY: 0, startCropX: 0, startCropY: 0 })

  const error = externalError ?? validationError

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setImageDataUrl(null)
      setValidationError(null)
      setCrop({ x: 0, y: 0, size: 100 })
      setImageNaturalSize({ w: 0, h: 0 })
      setPendingBlob(null)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isUploading) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, isUploading, onClose])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValidationError(null)
    const file = e.target.files?.[0]
    if (!file) return

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setValidationError('Please select a JPEG, PNG, WebP, or GIF image.')
      return
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setValidationError(`File must be smaller than ${MAX_FILE_SIZE_MB} MB.`)
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      setImageDataUrl(result)
      setPendingBlob(null)
    }
    reader.readAsDataURL(file)

    // Reset file input value so the same file can be re-selected
    e.target.value = ''
  }

  function handleImageLoad() {
    const img = previewImgRef.current
    const container = containerRef.current
    if (!img || !container) return

    const naturalW = img.naturalWidth
    const naturalH = img.naturalHeight
    setImageNaturalSize({ w: naturalW, h: naturalH })

    // Initial crop: centred square taking 80% of the shorter side
    const shortSide = Math.min(naturalW, naturalH)
    const cropSize = Math.round(shortSide * 0.8)
    setCrop({
      x: Math.round((naturalW - cropSize) / 2),
      y: Math.round((naturalH - cropSize) / 2),
      size: cropSize,
    })
  }

  // ---- Drag to move crop box ----
  function getImageRect(): DOMRect | null {
    return previewImgRef.current?.getBoundingClientRect() ?? null
  }

  function clientToImageCoords(clientX: number, clientY: number): { ix: number; iy: number } | null {
    const rect = getImageRect()
    if (!rect || !imageNaturalSize.w || !imageNaturalSize.h) return null
    const scaleX = imageNaturalSize.w / rect.width
    const scaleY = imageNaturalSize.h / rect.height
    return {
      ix: (clientX - rect.left) * scaleX,
      iy: (clientY - rect.top) * scaleY,
    }
  }

  function clampCrop(x: number, y: number, size: number): CropState {
    const { w, h } = imageNaturalSize
    const clampedX = Math.max(0, Math.min(x, w - size))
    const clampedY = Math.max(0, Math.min(y, h - size))
    return { x: clampedX, y: clampedY, size }
  }

  function startDrag(clientX: number, clientY: number) {
    dragRef.current = {
      dragging: true,
      startX: clientX,
      startY: clientY,
      startCropX: crop.x,
      startCropY: crop.y,
    }
  }

  function moveDrag(clientX: number, clientY: number) {
    if (!dragRef.current.dragging) return
    const rect = getImageRect()
    if (!rect || !imageNaturalSize.w || !imageNaturalSize.h) return
    const scaleX = imageNaturalSize.w / rect.width
    const scaleY = imageNaturalSize.h / rect.height
    const dx = (clientX - dragRef.current.startX) * scaleX
    const dy = (clientY - dragRef.current.startY) * scaleY
    const newX = dragRef.current.startCropX + dx
    const newY = dragRef.current.startCropY + dy
    setCrop((prev) => clampCrop(newX, newY, prev.size))
  }

  function endDrag() {
    dragRef.current.dragging = false
  }

  // Mouse events
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    startDrag(e.clientX, e.clientY)
  }, [crop])

  useEffect(() => {
    function onMouseMove(e: MouseEvent) { moveDrag(e.clientX, e.clientY) }
    function onMouseUp() { endDrag() }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [imageNaturalSize])

  // Touch events
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    startDrag(t.clientX, t.clientY)
  }, [crop])

  useEffect(() => {
    function onTouchMove(e: TouchEvent) {
      const t = e.touches[0]
      moveDrag(t.clientX, t.clientY)
    }
    function onTouchEnd() { endDrag() }
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [imageNaturalSize])

  // ---- Canvas output ----
  function buildBlob(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current
      const img = previewImgRef.current
      if (!canvas || !img) { reject(new Error('Canvas not ready')); return }

      canvas.width = OUTPUT_SIZE
      canvas.height = OUTPUT_SIZE
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Could not get canvas context')); return }

      ctx.drawImage(img, crop.x, crop.y, crop.size, crop.size, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Canvas toBlob failed')); return }
          resolve(blob)
        },
        'image/jpeg',
        0.85,
      )
    })
  }

  async function handleUpload() {
    setValidationError(null)
    let blob = pendingBlob
    if (!blob) {
      try {
        blob = await buildBlob()
        setPendingBlob(blob)
      } catch (err) {
        setValidationError('Failed to process image. Please try again.')
        return
      }
    }
    try {
      await onUpload(blob)
    } catch {
      // Modal stays open; externalError prop will surface the message
      // Blob is retained in pendingBlob for retry
    }
  }

  if (!open) return null

  // Compute crop overlay position as percentages of the rendered image
  const overlayStyle: React.CSSProperties =
    imageNaturalSize.w > 0
      ? {
          left: `${(crop.x / imageNaturalSize.w) * 100}%`,
          top: `${(crop.y / imageNaturalSize.h) * 100}%`,
          width: `${(crop.size / imageNaturalSize.w) * 100}%`,
          height: `${(crop.size / imageNaturalSize.h) * 100}%`,
        }
      : {}

  return (
    <>
      {/* Backdrop */}
      <div
        role="presentation"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex: 60,
        }}
        onClick={!isUploading ? onClose : undefined}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-crop-modal-title"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 61,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            pointerEvents: 'auto',
            backgroundColor: 'var(--color-bg-elevated, var(--color-surface))',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg, 16px)',
            padding: '1.5rem',
            width: '100%',
            maxWidth: 480,
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2
              id="avatar-crop-modal-title"
              style={{
                fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
                fontWeight: 700,
                fontSize: '1.125rem',
                color: 'var(--color-text)',
                margin: 0,
              }}
            >
              Crop your photo
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              aria-label="Close"
              style={{
                background: 'none',
                border: 'none',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                color: 'var(--color-muted)',
                fontSize: '1.25rem',
                lineHeight: 1,
                padding: '0.25rem',
                minWidth: 44,
                minHeight: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-sm, 4px)',
              }}
            >
              ✕
            </button>
          </div>

          {/* File input */}
          {!imageDataUrl && (
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '2rem',
                border: '2px dashed var(--color-border)',
                borderRadius: 'var(--radius-md, 12px)',
                cursor: 'pointer',
                backgroundColor: 'var(--color-surface)',
                transition: 'border-color calc(150ms * var(--motion-scale, 0.3))',
              }}
            >
              <span style={{ fontSize: '2rem' }} aria-hidden="true">📷</span>
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>
                Choose a photo
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                JPEG, PNG, WebP, GIF — max {MAX_FILE_SIZE_MB} MB
              </span>
              <input
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                onChange={handleFileChange}
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' }}
                aria-label="Upload photo"
              />
            </label>
          )}

          {/* Crop area */}
          {imageDataUrl && (
            <div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', marginBottom: '0.5rem' }}>
                Drag to reposition the crop area
              </p>
              <div
                ref={containerRef}
                style={{
                  position: 'relative',
                  width: '100%',
                  lineHeight: 0,
                  borderRadius: 'var(--radius-sm, 4px)',
                  overflow: 'hidden',
                  cursor: 'grab',
                  userSelect: 'none',
                  touchAction: 'none',
                }}
                onMouseDown={onMouseDown}
                onTouchStart={onTouchStart}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={previewImgRef}
                  src={imageDataUrl}
                  alt="Image to crop"
                  onLoad={handleImageLoad}
                  draggable={false}
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
                {/* Dark overlay outside crop */}
                {imageNaturalSize.w > 0 && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(0,0,0,0.55)',
                    }}
                  />
                )}
                {/* Crop box */}
                {imageNaturalSize.w > 0 && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      ...overlayStyle,
                      border: '2px solid var(--color-accent)',
                      boxShadow: 'inset 0 0 0 9999px transparent',
                      mixBlendMode: 'normal',
                      // Clear the dark overlay inside the crop box
                      backgroundColor: 'transparent',
                    }}
                  />
                )}
              </div>

              {/* Choose different photo */}
              <div style={{ marginTop: '0.5rem' }}>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    color: 'var(--color-accent)',
                    textDecoration: 'underline',
                    minHeight: 44,
                  }}
                >
                  Choose a different photo
                  <input
                    type="file"
                    accept={ACCEPTED_TYPES.join(',')}
                    onChange={handleFileChange}
                    style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' }}
                    aria-label="Choose a different photo"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <p
              role="alert"
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-error)',
                margin: 0,
                padding: '0.75rem',
                backgroundColor: 'rgba(var(--color-error-rgb, 220,38,38), 0.08)',
                borderRadius: 'var(--radius-sm, 4px)',
                border: '1px solid var(--color-error)',
              }}
            >
              {error}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {imageDataUrl && (
              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading}
                className="btn btn-primary w-full"
                style={{
                  padding: '0.875rem',
                  fontSize: '0.9375rem',
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  opacity: isUploading ? 0.7 : 1,
                  minHeight: 48,
                }}
              >
                {isUploading ? 'Uploading…' : pendingBlob ? 'Retry upload' : 'Upload photo'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="btn btn-ghost w-full"
              style={{
                padding: '0.75rem',
                fontSize: '0.9375rem',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                minHeight: 44,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Off-screen canvas for image processing */}
      <canvas
        ref={canvasRef}
        width={OUTPUT_SIZE}
        height={OUTPUT_SIZE}
        aria-hidden="true"
        style={{ position: 'fixed', left: -9999, top: -9999, visibility: 'hidden' }}
      />
    </>
  )
}
