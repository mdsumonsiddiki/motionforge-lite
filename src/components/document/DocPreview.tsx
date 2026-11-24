import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useDocumentStore, type Slot } from '../../store/documentStore'
import { drawSlot } from '../../editor/session'
import { setLayerRect } from '../../editor/edits'
import {
  clampRect,
  fitScale,
  rectFromPoints,
  resizeRect,
  MIN_LAYER_SIZE,
  type Handle
} from '../../editor/geometry'
import type { Layer, Rect } from '../../editor/types'

type Drag =
  | { kind: 'move' | Handle; layerId: string; startX: number; startY: number; startRect: Rect }
  | { kind: 'area'; startX: number; startY: number }

const HANDLES: Handle[] = ['nw', 'ne', 'sw', 'se']
const HANDLE_POS: Record<Handle, string> = {
  nw: '-left-1.5 -top-1.5 cursor-nwse-resize',
  ne: '-right-1.5 -top-1.5 cursor-nesw-resize',
  sw: '-left-1.5 -bottom-1.5 cursor-nesw-resize',
  se: '-right-1.5 -bottom-1.5 cursor-nwse-resize'
}

/**
 * Right side of the Document Editor: the rendered document with OCR box outlines,
 * placed images with drag / resize handles, and rectangle selection for Image Replace.
 */
export function DocPreview({
  slot,
  selectingArea,
  onAreaSelected
}: {
  slot: Slot
  selectingArea: boolean
  onAreaSelected: (rect: Rect) => void
}) {
  const { t } = useTranslation()
  const update = useDocumentStore((s) => s.update)
  const commitLayers = useDocumentStore((s) => s.commitLayers)

  const boxRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [avail, setAvail] = useState({ w: 0, h: 0 })
  const [drag, setDrag] = useState<Drag | null>(null)
  /** Live layers while dragging an image (committed to history on release). */
  const [draftLayers, setDraftLayers] = useState<Layer[] | null>(null)
  const [draftArea, setDraftArea] = useState<Rect | null>(null)

  const layers = draftLayers ?? slot.history.present
  const scale = fitScale(slot.width, slot.height, avail.w, avail.h)

  // Track the available preview size.
  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setAvail({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Redraw when layers or render assets change.
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) void drawSlot(slot.key, canvas, draftLayers ?? undefined)
  }, [slot.key, slot.history.present, slot.renderTick, draftLayers])

  /** Pointer position in image pixels. */
  const toImage = (e: PointerEvent): { x: number; y: number } => {
    const r = (e.currentTarget as HTMLElement).closest('[data-overlay]')!.getBoundingClientRect()
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale }
  }

  const startLayerDrag = (e: PointerEvent, layer: Layer, kind: 'move' | Handle): void => {
    if (selectingArea) return
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    const p = toImage(e)
    update(slot.key, { selectedLayerId: layer.id, selectedBoxId: null })
    setDrag({ kind, layerId: layer.id, startX: p.x, startY: p.y, startRect: layer.rect })
  }

  const onOverlayDown = (e: PointerEvent): void => {
    if (!selectingArea) return
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    const p = toImage(e)
    setDrag({ kind: 'area', startX: p.x, startY: p.y })
    setDraftArea({ x: p.x, y: p.y, w: 0, h: 0 })
  }

  const onMove = (e: PointerEvent): void => {
    if (!drag) return
    const p = toImage(e)
    if (drag.kind === 'area') {
      setDraftArea(clampRect(rectFromPoints(drag.startX, drag.startY, p.x, p.y), slot.width, slot.height))
      return
    }
    const dx = p.x - drag.startX
    const dy = p.y - drag.startY
    const rect =
      drag.kind === 'move'
        ? { ...drag.startRect, x: Math.round(drag.startRect.x + dx), y: Math.round(drag.startRect.y + dy) }
        : resizeRect(drag.startRect, drag.kind, Math.round(dx), Math.round(dy))
    setDraftLayers(setLayerRect(slot.history.present, drag.layerId, rect))
  }

  const onUp = (): void => {
    if (drag?.kind === 'area') {
      if (draftArea && draftArea.w >= MIN_LAYER_SIZE && draftArea.h >= MIN_LAYER_SIZE) {
        onAreaSelected(draftArea)
      }
      setDraftArea(null)
    } else if (draftLayers) {
      commitLayers(slot.key, draftLayers)
    }
    setDrag(null)
    setDraftLayers(null)
  }

  const px = (r: Rect) => ({
    left: r.x * scale,
    top: r.y * scale,
    width: r.w * scale,
    height: r.h * scale
  })

  return (
    <div ref={boxRef} className="relative h-full w-full overflow-hidden">
      <div
        className="absolute"
        style={{
          width: slot.width * scale,
          height: slot.height * scale,
          left: Math.max(0, (avail.w - slot.width * scale) / 2),
          top: Math.max(0, (avail.h - slot.height * scale) / 2)
        }}
      >
        <canvas ref={canvasRef} className="block h-full w-full shadow-lg" />
        <div
          data-overlay
          className={`absolute inset-0 ${selectingArea ? 'cursor-crosshair' : ''}`}
          onPointerDown={onOverlayDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
        >
          {/* OCR boxes (preview outlines). Hidden while selecting an area. */}
          {!selectingArea &&
            slot.ocr.map((box) => (
              <button
                key={box.id}
                type="button"
                title={box.text}
                aria-label={t('doc.editBox', { text: box.text })}
                onClick={() => update(slot.key, { selectedBoxId: box.id, selectedLayerId: null })}
                className={`absolute border ${
                  slot.selectedBoxId === box.id
                    ? 'border-2 border-indigo-500 bg-indigo-500/10'
                    : 'border-sky-500/70 hover:bg-sky-500/10'
                }`}
                style={px(box.rect)}
              />
            ))}

          {/* Placed images: click to select, drag to move, corners to resize. */}
          {layers.map((layer) =>
            layer.kind === 'image' ? (
              <div
                key={layer.id}
                role="button"
                tabIndex={0}
                aria-label={t('doc.placedImage')}
                onPointerDown={(e) => startLayerDrag(e, layer, 'move')}
                onPointerMove={onMove}
                onPointerUp={onUp}
                className={`absolute ${selectingArea ? 'pointer-events-none' : 'cursor-move'} ${
                  slot.selectedLayerId === layer.id ? 'outline-2 outline-indigo-500' : ''
                }`}
                style={px(layer.rect)}
              >
                {slot.selectedLayerId === layer.id &&
                  HANDLES.map((h) => (
                    <span
                      key={h}
                      onPointerDown={(e) => startLayerDrag(e, layer, h)}
                      onPointerMove={onMove}
                      onPointerUp={onUp}
                      className={`absolute h-3 w-3 rounded-sm border border-white bg-indigo-600 ${HANDLE_POS[h]}`}
                    />
                  ))}
              </div>
            ) : null
          )}

          {draftArea && (
            <div
              className="pointer-events-none absolute border-2 border-dashed border-amber-500 bg-amber-400/10"
              style={px(draftArea)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
