import { useEffect } from 'react'
import type { OutputState } from '../../electron/shared/output'
import { renderSlotPng } from '../editor/session'
import { useDocumentStore } from '../store/documentStore'
import { pickShownSlot, useOutputStore } from '../store/outputStore'

/** Content re-rendering is debounced while the user is editing. */
const CONTENT_DEBOUNCE_MS = 150

/**
 * Runs in the main window. Keeps the output window in sync:
 *  - view / background changes are sent at once (cheap);
 *  - the shown document is re-rendered to PNG when it changes (debounced).
 * Nothing is rendered or sent while the output window is closed.
 */
export function useOutputSync(): void {
  // Track the output window's open / closed status.
  useEffect(() => {
    const { setWindowOpen } = useOutputStore.getState()
    void window.api.output.isOpen().then(setWindowOpen)
    return window.api.output.onStatus(setWindowOpen)
  }, [])

  useEffect(() => {
    let content: OutputState['content'] = null
    let contentVersion = 0
    let lastBackground: unknown = null
    let backgroundVersion = 0
    let contentFor: unknown = null
    let timer: ReturnType<typeof setTimeout> | null = null
    let version = 0

    const send = (): void => {
      const o = useOutputStore.getState()
      if (!o.windowOpen) return
      if (o.customBackground !== lastBackground) {
        lastBackground = o.customBackground
        backgroundVersion++
      }
      window.api.output.sendState({
        contentVersion,
        backgroundVersion,
        orientation: o.orientation,
        background: o.background,
        customBackground: o.customBackground,
        view: o.view,
        content
      })
    }

    /** Re-renders the shown document when its key, layers or render assets changed. */
    const refreshContent = (): void => {
      const o = useOutputStore.getState()
      const docs = useDocumentStore.getState()
      const key = pickShownSlot(
        docs.slots.map((s) => s.key),
        o.documentKey
      )
      const slot = docs.slots.find((s) => s.key === key)
      const signature = slot ? [slot.key, slot.history.present, slot.renderTick] : null
      const same =
        Array.isArray(contentFor) &&
        Array.isArray(signature) &&
        signature.every((v, i) => v === (contentFor as unknown[])[i])
      if (!o.windowOpen || same || (signature === null && contentFor === null)) return

      contentFor = signature
      if (timer) clearTimeout(timer)
      if (!slot) {
        content = null
        contentVersion++
        send()
        return
      }
      const myVersion = ++version
      timer = setTimeout(() => {
        renderSlotPng(slot.key)
          .then((data) => {
            if (myVersion !== version) return // a newer render started
            content = { data }
            contentVersion++
            send()
          })
          .catch(() => undefined)
      }, CONTENT_DEBOUNCE_MS)
    }

    const unsubOutput = useOutputStore.subscribe((state, prev) => {
      if (state.windowOpen && !prev.windowOpen) {
        // Fresh window: render the content again and make it decode everything.
        contentFor = null
        contentVersion++
        backgroundVersion++
      }
      refreshContent()
      send()
    })
    const unsubDocs = useDocumentStore.subscribe(refreshContent)
    refreshContent()
    return () => {
      unsubOutput()
      unsubDocs()
      if (timer) clearTimeout(timer)
    }
  }, [])
}
