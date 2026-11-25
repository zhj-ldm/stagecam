import { create } from 'zustand'

import { encodeJpeg } from '@renderer/lib/capture'
import type { GalleryItem } from '@shared/types'

import { useAppStore } from './use-app-store'
import { useCameraStore } from './use-camera-store'

interface GalleryState {
  items: GalleryItem[]
  loaded: boolean
  sidebarOpen: boolean
  selecting: boolean
  selectedIds: string[]
  settingsOpen: boolean
  notice: string | null

  load: () => Promise<void>
  setSidebarOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  setNotice: (notice: string | null) => void

  capture: () => Promise<void>
  openItem: (item: GalleryItem) => Promise<void>
  toggleSelecting: () => void
  toggleSelected: (id: string) => void
  deleteSelected: () => Promise<void>
}

async function bitmapOfVideo(video: HTMLVideoElement): Promise<ImageBitmap> {
  return createImageBitmap(video)
}

async function bitmapOfFile(fileName: string): Promise<ImageBitmap> {
  const response = await fetch(window.api.gallery.urlOf(fileName))
  if (!response.ok) throw new Error('读取照片失败')
  const blob = await response.blob()
  return createImageBitmap(blob)
}

export const useGalleryStore = create<GalleryState>((set, get) => ({
  items: [],
  loaded: false,
  sidebarOpen: false,
  selecting: false,
  selectedIds: [],
  settingsOpen: false,
  notice: null,

  load: async () => {
    const items = await window.api.gallery.list()
    set({ items, loaded: true })
  },

  setSidebarOpen: (sidebarOpen) =>
    set(sidebarOpen ? { sidebarOpen } : { sidebarOpen, selecting: false, selectedIds: [] }),

  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setNotice: (notice) => set({ notice }),

  capture: async () => {
    const app = useAppStore.getState()
    const camera = useCameraStore.getState()

    let source: ImageBitmap | null = app.frozen
    let owned = false
    if (!source) {
      const video = app.videoEl
      if (!video || video.readyState < 2) {
        set({ notice: '摄像头尚未就绪' })
        return
      }
      source = await bitmapOfVideo(video)
      owned = true
    }

    try {
      const encoded = await encodeJpeg(source)
      const item = await window.api.gallery.add({
        buffer: encoded.buffer,
        width: encoded.width,
        height: encoded.height,
        deviceLabel: camera.activeLabel
      })
      // 拍照后不跳转照片视图：仅入相册，并按规则展开侧边栏
      set((state) => ({ items: [item, ...state.items], sidebarOpen: true }))
    } catch (error) {
      set({ notice: error instanceof Error ? error.message : '拍照失败' })
    } finally {
      if (owned) source?.close()
    }
  },

  openItem: async (item) => {
    try {
      const bitmap = await bitmapOfFile(item.fileName)
      useAppStore.getState().openPhoto({
        id: item.id,
        fileName: item.fileName,
        label: item.deviceLabel,
        bitmap
      })
      set({ selecting: false, selectedIds: [] })
    } catch (error) {
      set({ notice: error instanceof Error ? error.message : '照片打开失败' })
    }
  },

  toggleSelecting: () =>
    set((state) => ({ selecting: !state.selecting, selectedIds: [] })),

  toggleSelected: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((item) => item !== id)
        : [...state.selectedIds, id]
    })),

  deleteSelected: async () => {
    const ids = get().selectedIds
    if (ids.length === 0) return
    const items = await window.api.gallery.remove(ids)
    set({ items, selectedIds: [], selecting: false, notice: `已删除 ${ids.length} 张` })
  }
}))
