import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  backgroundFill,
  contentRect,
  coverRect,
  OUTPUT_SIZE
} from '../../electron/shared/output'
import { renderSlotPng } from '../editor/session'
import { useDocumentStore } from '../store/documentStore'
import { pickShownSlot, useOutputStore } from '../store/outputStore'

/** Re-render delay while the user is editing (same as the Output window sync). */
const RENDER_DEBOUNCE_MS = 150

async function toBitmap(data: Uint8Array, mime: string): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(new Blob([data as BlobPart], { type: mime }))
  } catch {
    return null
  }
}

/**
 * Small live preview of what the Output window shows (Home card, Webcam Output center).
 * Draws exactly like OutputApp: background fill / custom picture (cover), then the shown
 * document (rendered with its edits) at the output zoom / position. Read-only.
 */
export function OutputPreview({ style }: { style?: CSSProperties }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const orientation = useOutputStore((s) => s.orientation)
  const background = useOutputStore((s) => s.background)
  const customBackground = useOutputStore((s) => s.customBackground)
  const view = useOutputStore((s) => s.view)
  const documentKey = useOutputStore((s) => s.documentKey)
  const slots = useDocumentStore((s) => s.slots)
  const shownKey = pickShownSlot(
    slots.map((s) => s.key),
    documentKey
  )
  const shown = slots.find((s) => s.key === shownKey) ?? null

  // Rendered document (with edits), tagged with the slot it belongs to.
  const [content, setContent] = useState<{ key: string; bmp: ImageBitmap } | null>(null)
  const [bgBitmap, setBgBitmap] = useState<{ src: unknown; bmp: ImageBitmap } | null>(null)

  const present = shown?.history.present
  const renderTick = shown?.renderTick
  useEffect(() => {
    if (!shownKey) return
    let cancelled = false
    const timer = setTimeout(() => {
      void renderSlotPng(shownKey)
        .then((data) => toBitmap(data, 'image/png'))
        .then((bmp) => {
          if (cancelled || !bmp) return bmp?.close()
          setContent((prev) => {
            prev?.bmp.close()
            return { key: shownKey, bmp }
          })
        })
        .catch(() => undefined)
    }, RENDER_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [shownKey, present, renderTick])

  useEffect(() => {
    if (!customBackground) return
    let cancelled = false
    const mime = customBackground.type === 'png' ? 'image/png' : 'image/jpeg'
    void toBitmap(customBackground.data, mime).then((bmp) => {
      if (cancelled || !bmp) return bmp?.close()
      setBgBitmap((prev) => {
        prev?.bmp.close()
        return { src: customBackground, bmp }
      })
    })
    return () => {
      cancelled = true
    }
  }, [customBackground])

  // Free the bitmaps when the preview goes away.
  const latest = useRef({ content, bgBitmap })
  useEffect(() => {
    latest.current = { content, bgBitmap }
  })
  useEffect(
    () => () => {
      latest.current.content?.bmp.close()
      latest.current.bgBitmap?.bmp.close()
    },
    []
  )

  const doc = content && content.key === shownKey ? content.bmp : null
  const bg = bgBitmap && bgBitmap.src === customBackground ? bgBitmap.bmp : null

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const { width, height } = OUTPUT_SIZE[orientation]
    if (canvas.width !== width) canvas.width = width
    if (canvas.height !== height) canvas.height = height
    ctx.fillStyle = backgroundFill(background)
    ctx.fillRect(0, 0, width, height)
    if (background === 'custom' && bg) {
      const r = coverRect(width, height, bg.width, bg.height)
      ctx.drawImage(bg, r.x, r.y, r.w, r.h)
    }
    if (doc) {
      const r = contentRect(width, height, doc.width, doc.height, view)
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(doc, r.x, r.y, r.w, r.h)
    }
  }, [orientation, background, bg, doc, view])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain', ...style }}
    />
  )
}
