import { useEffect, useRef, type CSSProperties } from 'react'
import type { ImageType } from '../../electron/shared/document'

/**
 * <img> for image bytes (thumbnails, previews). The blob URL is created in an effect
 * and revoked on change / unmount, so no image memory is leaked.
 */
export function BlobImage({
  image,
  style
}: {
  image: { type: ImageType; data: Uint8Array }
  style?: CSSProperties
}) {
  const ref = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const img = ref.current
    if (!img) return
    const mime = image.type === 'png' ? 'image/png' : 'image/jpeg'
    const url = URL.createObjectURL(new Blob([image.data as BlobPart], { type: mime }))
    img.src = url
    return () => {
      img.removeAttribute('src')
      URL.revokeObjectURL(url)
    }
  }, [image])
  return <img ref={ref} alt="" style={style} />
}
