/** 拍照落盘前的编码：始终用原始分辨率，不带任何缩放或批注 */
export interface EncodedPhoto {
  buffer: ArrayBuffer
  width: number
  height: number
}

const JPEG_QUALITY = 0.92

export async function encodeJpeg(source: ImageBitmap): Promise<EncodedPhoto> {
  const canvas = document.createElement('canvas')
  canvas.width = source.width
  canvas.height = source.height
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('无法创建编码画布')
  ctx.drawImage(source, 0, 0)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
  })
  if (!blob) throw new Error('照片编码失败')

  return {
    buffer: await blob.arrayBuffer(),
    width: source.width,
    height: source.height
  }
}
