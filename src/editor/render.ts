import type { Layer, TextLayer } from './types'

/**
 * A removal patch ready to draw: box-sized, transparent except the old letter pixels.
 * Drawn with drawImage (alpha-blended) — putImageData would also write the transparent
 * pixels and punch holes into the image.
 */
export type DrawnPatch = { x: number; y: number; image: CanvasImageSource }

/** Decoded, non-serialisable data needed to draw one document. */
export type RenderAssets = {
  original: ImageBitmap
  /** Removal patches, keyed by patchKey(layer). */
  patches: Map<string, DrawnPatch>
  /** Patch keys whose removal failed: their new text is drawn without removing the old. */
  failedPatches: Set<string>
  /** Decoded images of image layers, keyed by layer id. */
  images: Map<string, HTMLImageElement>
}

/**
 * Cache key of a text layer's removal patch: box id + box rect. When the user adjusts a
 * box and applies again, the rect changes, so the old patch is not reused.
 */
export const patchKey = (layer: Pick<TextLayer, 'boxId' | 'rect'>): string =>
  `${layer.boxId}@${layer.rect.x},${layer.rect.y},${layer.rect.w},${layer.rect.h}`

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

/** Text is never shrunk below this size, even if it still does not fit. */
export const MIN_FIT_FONT_PX = 6

/**
 * Font size that keeps the text inside its box: the widest line must fit the box width and
 * all lines together must fit the box height. Never larger than the requested size.
 * Text width grows linearly with the font size, so one measurement at the requested size
 * is enough.
 * @param measure width of one line at the given font size (canvas measureText in the app)
 */
export function fitFontSize(
  lines: readonly string[],
  fontSize: number,
  box: { w: number; h: number },
  measure: (line: string, size: number) => number
): number {
  const widest = Math.max(0, ...lines.map((line) => measure(line, fontSize)))
  const byWidth = widest > box.w && widest > 0 ? (fontSize * box.w) / widest : fontSize
  const byHeight = box.h / (Math.max(1, lines.length) * LINE_HEIGHT)
  const fitted = Math.floor(Math.min(fontSize, byWidth, Math.max(byHeight, 0)) * 10) / 10
  return Math.max(Math.min(MIN_FIT_FONT_PX, fontSize), fitted)
}

/**
 * Draws the document at full resolution:
 *  1. the original
 *  2. every removal patch (old letters erased; all other pixels are transparent)
 *  3. layers in order: new text, user images
 * All patches go first so a patch can never cover another line's new text.
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
    if (layer.kind !== 'text') continue
    const patch = assets.patches.get(patchKey(layer))
    if (patch) ctx.drawImage(patch.image, patch.x, patch.y)
  }

  for (const layer of layers) {
    if (layer.kind === 'text') {
      // Text waits for its patch (or for the removal to have failed).
      const key = patchKey(layer)
      if (!assets.patches.has(key) && !assets.failedPatches.has(key)) continue
      const lines = layer.text.split('\n')
      const { rect, anchor } = layer
      ctx.save()
      const measure = (line: string, s: number): number => {
        ctx.font = fontCss(s, layer.fontFamily)
        return ctx.measureText(line).width
      }
      ctx.fillStyle = layer.color
      if (anchor && lines.length === 1) {
        // One line: on the old text's baseline, starting where the old letters started.
        // Only shrunk if it would run past the right edge of the box.
        const room = { w: Math.max(1, rect.x + rect.w - anchor.x), h: Number.POSITIVE_INFINITY }
        const size = fitFontSize(lines, layer.fontSize, room, measure)
        ctx.font = fontCss(size, layer.fontFamily)
        ctx.textBaseline = 'alphabetic'
        ctx.fillText(layer.text, anchor.x, anchor.y)
      } else {
        // Several lines (or an old layer without anchor): centred in the box, shrunk to fit.
        const size = fitFontSize(lines, layer.fontSize, rect, measure)
        const ys = lineCenters(rect.y, rect.h, size, lines.length)
        ctx.font = fontCss(size, layer.fontFamily)
        ctx.textBaseline = 'middle'
        lines.forEach((line, i) => ctx.fillText(line, rect.x, ys[i] ?? 0))
      }
      ctx.restore()
    } else {
      const img = assets.images.get(layer.id)
      if (img?.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, layer.rect.x, layer.rect.y, layer.rect.w, layer.rect.h)
      }
    }
  }
}
