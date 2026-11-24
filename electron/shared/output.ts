/**
 * Webcam Output types and pure layout math (spec section 10).
 * Shared by main (window sizing), the main renderer (controls) and the output window (drawing).
 */
import type { ImageType } from './document'

export type Orientation = 'landscape' | 'portrait'
export type OutputBackground = 'original' | 'green' | 'custom'

/** Output resolution: 1280×720 (16:9) or 720×1280 (9:16). Not user-editable. */
export const OUTPUT_SIZE: Record<Orientation, { width: number; height: number }> = {
  landscape: { width: 1280, height: 720 },
  portrait: { width: 720, height: 1280 }
}

/** Fixed output frame rate. */
export const OUTPUT_FPS = 24

/** Chroma key color for OBS (spec section 10). */
export const GREEN_SCREEN = '#00ff00'

/** Fill around the document for the "Original" background (user decision: white). */
export const ORIGINAL_BACKGROUND = '#ffffff'

/**
 * Base fill color of an output frame. Green Screen uses the chroma key color; Original uses
 * white. Custom is drawn over this fill, so white also shows while the picture is loading.
 */
export function backgroundFill(background: OutputBackground | undefined): string {
  return background === 'green' ? GREEN_SCREEN : ORIGINAL_BACKGROUND
}

/** Window title OBS users pick in "Window Capture" (kept in English on purpose). */
export const OUTPUT_WINDOW_TITLE = 'MotionForge Lite Output'

/** Zoom / position of the shown content. pan is a fraction of the output size. */
export type OutputView = { zoom: number; panX: number; panY: number }

export const DEFAULT_VIEW: OutputView = { zoom: 1, panX: 0, panY: 0 }
export const ZOOM_MIN = 0.2
export const ZOOM_MAX = 5
export const ZOOM_STEP = 1.1
export const PAN_STEP = 0.05
/** Content may be moved at most this far (fraction of the output) from the centre. */
export const PAN_LIMIT = 1

/** Everything the output window needs to draw a frame. */
export type OutputState = {
  orientation: Orientation
  background: OutputBackground
  /** Custom background picture (only used when background = 'custom'). */
  customBackground: { type: ImageType; data: Uint8Array } | null
  view: OutputView
  /** Rendered document (PNG). null = nothing to show. */
  content: { data: Uint8Array } | null
  /**
   * Increase when content / custom background change. Bytes arrive as new arrays on every
   * IPC message, so these numbers tell the output window when it must decode again.
   */
  contentVersion: number
  backgroundVersion: number
}

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v))

export function zoomIn(view: OutputView): OutputView {
  return { ...view, zoom: clamp(view.zoom * ZOOM_STEP, ZOOM_MIN, ZOOM_MAX) }
}

export function zoomOut(view: OutputView): OutputView {
  return { ...view, zoom: clamp(view.zoom / ZOOM_STEP, ZOOM_MIN, ZOOM_MAX) }
}

export type Direction = 'up' | 'down' | 'left' | 'right'

export function pan(view: OutputView, dir: Direction): OutputView {
  const dx = dir === 'left' ? -PAN_STEP : dir === 'right' ? PAN_STEP : 0
  const dy = dir === 'up' ? -PAN_STEP : dir === 'down' ? PAN_STEP : 0
  return {
    ...view,
    panX: clamp(view.panX + dx, -PAN_LIMIT, PAN_LIMIT),
    panY: clamp(view.panY + dy, -PAN_LIMIT, PAN_LIMIT)
  }
}

export type DrawRect = { x: number; y: number; w: number; h: number }

/**
 * Where to draw content of size contentW×contentH on an outW×outH canvas:
 * fit inside ("contain") at zoom 1, scaled by zoom, centred, then shifted by pan.
 */
export function contentRect(
  outW: number,
  outH: number,
  contentW: number,
  contentH: number,
  view: OutputView
): DrawRect {
  if (contentW <= 0 || contentH <= 0) return { x: 0, y: 0, w: 0, h: 0 }
  const scale = Math.min(outW / contentW, outH / contentH) * view.zoom
  const w = contentW * scale
  const h = contentH * scale
  return {
    x: (outW - w) / 2 + view.panX * outW,
    y: (outH - h) / 2 + view.panY * outH,
    w,
    h
  }
}

/** Rect that fills the whole canvas, cropping the picture if needed ("cover"), for backgrounds. */
export function coverRect(outW: number, outH: number, imgW: number, imgH: number): DrawRect {
  if (imgW <= 0 || imgH <= 0) return { x: 0, y: 0, w: outW, h: outH }
  const scale = Math.max(outW / imgW, outH / imgH)
  const w = imgW * scale
  const h = imgH * scale
  return { x: (outW - w) / 2, y: (outH - h) / 2, w, h }
}

/**
 * Initial window content size: the output resolution, scaled down (keeping the aspect ratio)
 * so it fits into the screen's work area.
 */
export function fitWindowSize(
  orientation: Orientation,
  workArea: { width: number; height: number },
  maxShare = 0.8
): { width: number; height: number } {
  const { width, height } = OUTPUT_SIZE[orientation]
  const scale = Math.min(1, (workArea.width * maxShare) / width, (workArea.height * maxShare) / height)
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}
