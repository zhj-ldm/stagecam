import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

import type { GalleryItem, SavePhotoPayload } from '@shared/types'

import { getSettings } from './settings-store'

const INDEX_FILE = '.index.json'

interface IndexFile {
  version: 1
  items: GalleryItem[]
}

async function galleryDir(): Promise<string> {
  const settings = await getSettings()
  return settings.galleryDir
}

async function readIndex(dir: string): Promise<IndexFile> {
  try {
    const raw = await fs.readFile(path.join(dir, INDEX_FILE), 'utf8')
    const parsed = JSON.parse(raw) as Partial<IndexFile>
    if (!Array.isArray(parsed.items)) return { version: 1, items: [] }
    return { version: 1, items: parsed.items }
  } catch {
    return { version: 1, items: [] }
  }
}

async function writeIndex(dir: string, items: GalleryItem[]): Promise<void> {
  await fs.mkdir(dir, { recursive: true })
  const payload: IndexFile = { version: 1, items }
  await fs.writeFile(path.join(dir, INDEX_FILE), JSON.stringify(payload, null, 2), 'utf8')
}

function fileNameFor(createdAt: Date): string {
  const stamp = [
    createdAt.getFullYear(),
    String(createdAt.getMonth() + 1).padStart(2, '0'),
    String(createdAt.getDate()).padStart(2, '0'),
    '-',
    String(createdAt.getHours()).padStart(2, '0'),
    String(createdAt.getMinutes()).padStart(2, '0'),
    String(createdAt.getSeconds()).padStart(2, '0')
  ].join('')
  return `zt-${stamp}-${randomUUID().slice(0, 6)}.jpg`
}

export async function listPhotos(): Promise<GalleryItem[]> {
  const dir = await galleryDir()
  const index = await readIndex(dir)
  return [...index.items].sort((a, b) => b.createdAt - a.createdAt)
}

export async function addPhoto(payload: SavePhotoPayload): Promise<GalleryItem> {
  const dir = await galleryDir()
  await fs.mkdir(dir, { recursive: true })

  const createdAt = Date.now()
  const fileName = fileNameFor(new Date(createdAt))
  await fs.writeFile(path.join(dir, fileName), Buffer.from(payload.buffer))

  const item: GalleryItem = {
    id: randomUUID(),
    fileName,
    createdAt,
    width: payload.width,
    height: payload.height,
    deviceLabel: payload.deviceLabel
  }

  const index = await readIndex(dir)
  // 索引里只保留最新 2000 条，避免长期使用后单文件无限膨胀
  const items = [item, ...index.items].slice(0, 2000)
  await writeIndex(dir, items)
  return item
}

export async function removePhotos(ids: string[]): Promise<GalleryItem[]> {
  const dir = await galleryDir()
  const index = await readIndex(dir)
  const toRemove = index.items.filter((item) => ids.includes(item.id))
  const kept = index.items.filter((item) => !ids.includes(item.id))

  await Promise.all(
    toRemove.map((item) => fs.rm(path.join(dir, item.fileName), { force: true }))
  )
  await writeIndex(dir, kept)
  return [...kept].sort((a, b) => b.createdAt - a.createdAt)
}

export async function resolvePhotoPath(fileName: string): Promise<string> {
  const dir = await galleryDir()
  // 只允许读取相册目录内的文件，阻断路径穿越
  const safeName = path.basename(fileName)
  return path.join(dir, safeName)
}
