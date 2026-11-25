import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'

import type { AppInfo, AppSettings, GalleryItem, SavePhotoPayload } from '@shared/types'

import { addPhoto, listPhotos, removePhotos } from './gallery-store'
import {
  defaultGalleryDir,
  getSettings,
  patchSettings,
  resetSettings
} from './settings-store'

/** 尺寸上限：单张照片 40MB，避免异常数据写爆磁盘 */
const MAX_PHOTO_BYTES = 40 * 1024 * 1024

function requireWindow(): BrowserWindow | null {
  return BrowserWindow.getAllWindows()[0] ?? null
}

function assertPhotoPayload(payload: SavePhotoPayload): void {
  const { buffer, width, height, deviceLabel } = payload
  if (!(buffer instanceof ArrayBuffer)) throw new Error('照片数据格式非法')
  if (buffer.byteLength > MAX_PHOTO_BYTES) throw new Error('照片超出体积上限')
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('照片尺寸非法')
  }
  if (typeof deviceLabel !== 'string') throw new Error('设备标识非法')
}

export function registerIpc(): void {
  ipcMain.handle('settings:get', (): Promise<AppSettings> => getSettings())

  ipcMain.handle('settings:patch', (_event, patch: Partial<AppSettings>) =>
    patchSettings(patch ?? {})
  )

  ipcMain.handle('settings:reset', (): Promise<AppSettings> => resetSettings())

  ipcMain.handle('settings:pickGalleryDir', async (): Promise<string | null> => {
    const win = requireWindow()
    const options: Electron.OpenDialogOptions = {
      title: '选择相册存储目录',
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: (await getSettings()).galleryDir
    }
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('gallery:list', (): Promise<GalleryItem[]> => listPhotos())

  ipcMain.handle('gallery:add', async (_event, payload: SavePhotoPayload) => {
    assertPhotoPayload(payload)
    return addPhoto(payload)
  })

  ipcMain.handle('gallery:remove', (_event, ids: string[]) => {
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
      throw new Error('删除参数非法')
    }
    return removePhotos(ids)
  })

  ipcMain.handle('app:info', (): AppInfo => ({
    version: app.getVersion(),
    platform: process.platform,
    defaultGalleryDir: defaultGalleryDir()
  }))

  ipcMain.on('app:close', () => requireWindow()?.close())
  ipcMain.on('app:minimize', () => requireWindow()?.minimize())
  ipcMain.on('app:toggleFullscreen', () => {
    const win = requireWindow()
    if (!win) return
    win.setFullScreen(!win.isFullScreen())
  })

  ipcMain.handle('app:openGalleryDir', async () => {
    const dir = (await getSettings()).galleryDir
    await shell.openPath(dir)
  })
}
