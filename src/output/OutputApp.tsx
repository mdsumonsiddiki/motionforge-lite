import { useEffect, useRef } from 'react'
import {
  backgroundFill,
  contentRect,
  coverRect,
  OUTPUT_FPS,
  OUTPUT_SIZE,
  type OutputState
} from '../../electron/shared/output'

/** Decodes image bytes into an ImageBitmap (null on failure). */
async function toBitmap(data: Uint8Array, mime: string): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(new Blob([data as Uint8Array<ArrayBuffer>], { type: mime }))
  } catch {
    return null
  }
}

/**
 * The Output window (spec section 10): no controls, only the live output on a canvas at the
 * fixed output resolution (1280×720 or 720×1280), scaled to the window. Draws at 24 FPS
 * (a frame is only painted when something changed, to keep CPU use low).
 */
export function OutputApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let state: OutputState | null = null
    let content: ImageBitmap | null = null
    let background: ImageBitmap | null = null
    let dirty = true
    /** Increments per new content, so a slow decode never replaces a newer one. */
    let contentToken = 0

    const apply = (next: OutputState): void => {
      const prev = state
      state = next
      dirty = true
      // Decode only what changed.
      if (next.contentVersion !== prev?.contentVersion) {
        const my = ++contentToken
        if (!next.content) {
          content?.close()
          content = null
        } else {
          void toBitmap(next.content.data, 'image/png').then((bmp) => {
            if (my !== contentToken) return bmp?.close()
            content?.close()
            content = bmp
            dirty = true
          })
        }
      }
      if (next.backgroundVersion !== prev?.backgroundVersion) {
        if (!next.customBackground) {
          background?.close()
          background = null
        } else {
          const mime = next.customBackground.type === 'png' ? 'image/png' : 'image/jpeg'
          void toBitmap(next.customBackground.data, mime).then((bmp) => {
            background?.close()
            background = bmp
            dirty = true
          })
        }
      }
    }
    const unsubscribe = window.api.output.onState(apply)
    // Pick up the current state (the main window may have sent it before we started).
    void window.api.output.getState().then((s) => {
      if (s && !state) apply(s)
    })

    const draw = (): void => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx || !dirty) return
      dirty = false
      const { width, height } = OUTPUT_SIZE[state?.orientation ?? 'landscape']
      if (canvas.width !== width) canvas.width = width
      if (canvas.height !== height) canvas.height = height

      // Background: Original (white) / Green Screen / Custom picture.
      ctx.fillStyle = backgroundFill(state?.background)
      ctx.fillRect(0, 0, width, height)
      if (state?.background === 'custom' && background) {
        const r = coverRect(width, height, background.width, background.height)
        ctx.drawImage(background, r.x, r.y, r.w, r.h)
      }
      if (state && content) {
        const r = contentRect(width, height, content.width, content.height, state.view)
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(content, r.x, r.y, r.w, r.h)
      }
    }

    const timer = setInterval(draw, 1000 / OUTPUT_FPS)
    return () => {
      clearInterval(timer)
      unsubscribe()
      content?.close()
      background?.close()
    }
  }, [])

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden bg-white">
      <canvas ref={canvasRef} className="h-full w-full object-contain" />
    </div>
  )
}
