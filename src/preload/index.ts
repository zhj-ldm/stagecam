import { contextBridge, ipcRenderer } from 'electron'

import type { AppSettings, DesktopApi, SavePhotoPayload } from '@shared/types'

const api: DesktopApi = {
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    patch: (patch: Partial<AppSettings>) => ipcRenderer.invoke('settings:patch', patch),
    pickGalleryDir: () => ipcRenderer.invoke('settings:pickGalleryDir'),
    reset: () => ipcRenderer.invoke('settings:reset')
  },
  gallery: {
    list: () => ipcRenderer.invoke('gallery:list'),
    add: (payload: SavePhotoPayload) => ipcRenderer.invoke('gallery:add', payload),
    remove: (ids: string[]) => ipcRenderer.invoke('gallery:remove', ids),
    urlOf: (fileName: string) => `asset://gallery/${encodeURIComponent(fileName)}`
  },
  app: {
    info: () => ipcRenderer.invoke('app:info'),
    close: () => ipcRenderer.send('app:close'),
    minimize: () => ipcRenderer.send('app:minimize'),
    toggleFullscreen: () => ipcRenderer.send('app:toggleFullscreen'),
    openGalleryDir: () => ipcRenderer.invoke('app:openGalleryDir')
  }
}

contextBridge.exposeInMainWorld('api', api)
