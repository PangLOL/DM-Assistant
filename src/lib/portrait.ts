import { dataUrlToBlob, downloadBlob } from './csv'

const MAX_EDGE = 256
const MAX_DATA_URL_CHARS = 500_000

export function sanitizePortraitDataUrl(value: string | undefined | null): string {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed.startsWith('data:image/')) return ''
  if (trimmed.length > MAX_DATA_URL_CHARS) return ''
  return trimmed
}

export function safeCharacterFilename(name: string): string {
  const safe = name
    .trim()
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return safe || 'character'
}

export async function resizeImageToDataUrl(file: File, maxSize = MAX_EDGE): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('Could not process portrait')
  }
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.82)
}

export function portraitDownloadName(name: string, dataUrl: string): string {
  const base = safeCharacterFilename(name)
  if (dataUrl.startsWith('data:image/png')) return `${base}.png`
  if (dataUrl.startsWith('data:image/webp')) return `${base}.webp`
  return `${base}.jpg`
}

export function downloadPortraitFile(name: string, dataUrl: string) {
  const blob = dataUrlToBlob(dataUrl)
  if (!blob) return
  downloadBlob(portraitDownloadName(name, dataUrl), blob)
}
