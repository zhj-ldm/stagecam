import { promises as fs } from 'node:fs'
import path from 'node:path'

import { app } from 'electron'

import type { AppSettings } from '@shared/types'

const SETTINGS_FILE = 'settings.json'

const DEFAULTS = (): AppSettings => ({
  galleryDir: path.join(app.getPath('userData'), 'Gallery'),
  deviceId: null,
  deviceLabel: null,
  penColor: '#F53F3F',
  penWidth: 4,
  eraserWidth: 28,
  rotation: 0
})

let cached: AppSettings | null = null

function settingsPath(): string {
  return path.join(app.getPath('userData'), SETTINGS_FILE)
}

async function readFromDisk(): Promise<AppSettings> {
  try {
    const raw = await fs.readFile(settingsPath(), 'utf8')
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    // 与默认值合并，避免旧版本配置缺字段导致运行时报错
    return { ...DEFAULTS(), ...parsed }
  } catch {
    return DEFAULTS()
  }
}

async function writeToDisk(next: AppSettings): Promise<void> {
  await fs.mkdir(path.dirname(settingsPath()), { recursive: true })
  await fs.writeFile(settingsPath(), JSON.stringify(next, null, 2), 'utf8')
}

export async function getSettings(): Promise<AppSettings> {
  if (!cached) cached = await readFromDisk()
  return cached
}

export async function patchSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings()
  const next: AppSettings = { ...current, ...patch }
  if (!next.galleryDir) next.galleryDir = DEFAULTS().galleryDir
  if (![0, 90, 180, 270].includes(next.rotation)) next.rotation = 0
  await writeToDisk(next)
  cached = next
  return next
}

export async function resetSettings(): Promise<AppSettings> {
  const next = DEFAULTS()
  await writeToDisk(next)
  cached = next
  return next
}

export function defaultGalleryDir(): string {
  return path.join(app.getPath('userData'), 'Gallery')
}
