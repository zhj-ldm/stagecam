import { create } from 'zustand'

import { clampView, fitView, zoomAt } from '@renderer/lib/geometry'
import type { InkTool, Stroke } from '@renderer/lib/ink'

export type AppMode = 'browse' | 'annotate'

export interface PhotoDoc {
  id: string
  fileName: string
  label: string
  bitmap: ImageBitmap
}

interface AppState {
  mode: AppMode
  tool: InkTool
  penColor: string
  penWidth: number
  eraserWidth: number

  videoEl: HTMLVideoElement | null
  frozen: ImageBitmap | null
  photo: PhotoDoc | null

  view: { scale: number; x: number; y: number }
  strokesByDoc: Record<string, Stroke[]>
  inkVersion: number

  setMode: (mode: AppMode) => void
  setTool: (tool: InkTool) => void
  setPenColor: (color: string) => void
  setPenWidth: (width: number) => void
  setEraserWidth: (width: number) => void
  setVideoEl: (el: HTMLVideoElement | null) => void

  freeze: () => Promise<void>
  unfreeze: () => void
  openPhoto: (doc: PhotoDoc) => void
  backToLive: () => void

  setView: (view: { scale: number; x: number; y: number }) => void
  resetView: () => void
  zoomBy: (factor: number, anchorX: number, anchorY: number) => void
  panBy: (dx: number, dy: number) => void

  /** 笔迹在收笔时一次性提交，书写过程中不触碰 store */
  commitStroke: (stroke: Stroke) => void
  undo: () => void
  eraseAll: () => void

  /** 当前用于绘制与取图的文档 key：live 与每张照片各自独立笔迹层 */
  docKey: () => string
  currentStrokes: () => Stroke[]
}

export const useAppStore = create<AppState>((set, get) => ({
  mode: 'browse',
  tool: 'pen',
  penColor: '#F53F3F',
  penWidth: 5,
  eraserWidth: 32,

  videoEl: null,
  frozen: null,
  photo: null,

  view: fitView(),
  strokesByDoc: {},
  inkVersion: 0,

  setMode: (mode) => set({ mode }),
  setTool: (tool) => set({ tool }),

  setPenColor: (penColor) => {
    set({ penColor, tool: 'pen' })
    void window.api.settings.patch({ penColor })
  },
  setPenWidth: (penWidth) => {
    set({ penWidth })
    void window.api.settings.patch({ penWidth })
  },
  setEraserWidth: (eraserWidth) => {
    set({ eraserWidth })
    void window.api.settings.patch({ eraserWidth })
  },

  setVideoEl: (videoEl) => set({ videoEl }),

  freeze: async () => {
    const { videoEl, photo } = get()
    if (photo || !videoEl || videoEl.readyState < 2) return
    const bitmap = await createImageBitmap(videoEl)
    // 锁定只是定格画面，当前缩放/位置与批注必须原样保留
    set({ frozen: bitmap })
  },

  unfreeze: () => {
    set((state) => {
      state.frozen?.close()
      return { frozen: null }
    })
  },

  openPhoto: (doc) => {
    set((state) => {
      state.frozen?.close()
      return { photo: doc, frozen: null, view: fitView() }
    })
  },

  backToLive: () => {
    set((state) => {
      state.photo?.bitmap.close()
      return { photo: null, view: fitView() }
    })
  },

  setView: (view) => set({ view }),
  resetView: () => set({ view: fitView() }),

  zoomBy: (factor, anchorX, anchorY) => {
    const { view } = get()
    const viewport = viewportSize()
    const image = imageSize()
    if (!viewport) return
    const next = zoomAt(view, factor, anchorX, anchorY, image.w, image.h, viewport.w, viewport.h)
    set({ view: next })
  },

  panBy: (dx, dy) => {
    const { view, mode } = get()
    if (mode !== 'browse') return
    const viewport = viewportSize()
    const image = imageSize()
    if (!viewport) return
    const moved = { scale: view.scale, x: view.x + dx, y: view.y + dy }
    set({ view: clampView(moved, image.w, image.h, viewport.w, viewport.h) })
  },

  commitStroke: (stroke) => {
    const key = get().docKey()
    const list = get().strokesByDoc[key] ?? []
    set({
      strokesByDoc: { ...get().strokesByDoc, [key]: [...list, stroke] },
      inkVersion: get().inkVersion + 1
    })
  },

  undo: () => {
    const key = get().docKey()
    const list = get().strokesByDoc[key] ?? []
    if (list.length === 0) return
    set({
      strokesByDoc: { ...get().strokesByDoc, [key]: list.slice(0, -1) },
      inkVersion: get().inkVersion + 1
    })
  },

  eraseAll: () => {
    const key = get().docKey()
    set({
      strokesByDoc: { ...get().strokesByDoc, [key]: [] },
      inkVersion: get().inkVersion + 1
    })
  },

  docKey: () => {
    const { photo } = get()
    return photo ? `photo:${photo.id}` : 'live'
  },

  currentStrokes: () => {
    const key = get().docKey()
    return get().strokesByDoc[key] ?? []
  }
}))

/** 窗口尺寸在渲染层的单点来源，供各类手势计算使用 */
let viewportProvider: (() => { w: number; h: number } | null) | null = null
let imageProvider: (() => { w: number; h: number }) | null = null

export function setStageMetrics(
  viewport: () => { w: number; h: number } | null,
  image: () => { w: number; h: number }
): void {
  viewportProvider = viewport
  imageProvider = image
}

function viewportSize(): { w: number; h: number } | null {
  return viewportProvider ? viewportProvider() : null
}

function imageSize(): { w: number; h: number } {
  return imageProvider ? imageProvider() : { w: 1920, h: 1080 }
}
