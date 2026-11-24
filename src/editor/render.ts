import type { Patch } from '../workers/inpaintClient'
import type { Layer } from './types'

/** Decoded, non-serialisable data needed to draw one document. */
export type RenderAssets = {
  original: ImageBitmap
  /** Inpainted patches (mask area only), keyed by OCR box id. */
  patches: Map<string, Patch>
  /** Boxes whose inpainting failed: their new text is drawn without removing the old. */
  failedPatches: Set<string>
  /** Decoded images of image layers, keyed by layer id. */
  images: Map<string, HTMLImageElement>
}

/** CSS font string for canvas text. */
export const fontCss = (size: number, family: string): string =>
  `${size}px "${family.replace(/"/g, '')}"`

/** Line height relative to the font size for multi-line text. */
export const LINE_HEIGHT = 1.2

/**
 * Baseline-middle y positions for each line, centred vertically on the box.
 * One line sits in the middle of the box; more lines are stacked around it.
 */
export function lineCenters(boxY: number, boxH: number, fontSize: number, lines: number): number[] {
  const step = fontSize * LINE_HEIGHT
  const first = boxY + boxH / 2 - ((lines - 1) * step) / 2
  return Array.from({ length: lines }, (_, i) => first + i * step)
}

/**
 * Draws the document at full resolution: original → layers in order.
 * Text layer = inpainted patch (old text removed) + new text.
 * Image layer = the user image stretched to its rect.
 * A layer whose patch/image is still being prepared is skipped; the caller re-renders when
 * it arrives (and Save / Export wait for everything first).
 */
export function renderDocument(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  layers: readonly Layer[],
  assets: RenderAssets
): void {
  const { original } = assets
  ctx.clearRect(0, 0, original.width, original.height)
  ctx.drawImage(original, 0, 0)

  for (const layer of layers) {
    if (layer.kind === 'text') {
      const patch = assets.patches.get(layer.boxId)
      if (patch) ctx.putImageData(patch.image, patch.x, patch.y)
      else if (!assets.failedPatches.has(layer.boxId)) continue
      const lines = layer.text.split('\n')
      const ys = lineCenters(layer.rect.y, layer.rect.h, layer.fontSize, lines.length)
      ctx.save()
      ctx.font = fontCss(layer.fontSize, layer.fontFamily)
      ctx.fillStyle = layer.color
      ctx.textBaseline = 'middle'
      lines.forEach((line, i) => ctx.fillText(line, layer.rect.x, ys[i] ?? 0))
      ctx.restore()
    } else {
      const img = assets.images.get(layer.id)
      if (img?.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, layer.rect.x, layer.rect.y, layer.rect.w, layer.rect.h)
      }
    }
  }
}
