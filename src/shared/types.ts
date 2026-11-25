/**
 * 主进程与渲染进程共享的契约类型。
 * 任何跨 IPC 传递的结构都必须先在这里定义，禁止两端各自造一份。
 */

export interface GalleryItem {
  id: string
  fileName: string
  /** 拍摄时刻的毫秒时间戳，列表按此倒序 */
  createdAt: number
  width: number
  height: number
  deviceLabel: string
}

export interface AppSettings {
  /** 相册目录；为空时使用默认目录 */
  galleryDir: string
  /** 记住上次使用的摄像头设备 */
  deviceId: string | null
  deviceLabel: string | null
  penColor: string
  penWidth: number
  eraserWidth: number
}

export interface SavePhotoPayload {
  buffer: ArrayBuffer
  width: number
  height: number
  deviceLabel: string
}

export interface AppInfo {
  version: string
  platform: string
  defaultGalleryDir: string
}

export interface DesktopApi {
  settings: {
    get: () => Promise<AppSettings>
    patch: (patch: Partial<AppSettings>) => Promise<AppSettings>
    pickGalleryDir: () => Promise<string | null>
    reset: () => Promise<AppSettings>
  }
  gallery: {
    list: () => Promise<GalleryItem[]>
    add: (payload: SavePhotoPayload) => Promise<GalleryItem>
    remove: (ids: string[]) => Promise<GalleryItem[]>
    /** 缩略图/原图统一用 asset:// 协议读取，避免渲染层接触文件系统 */
    urlOf: (fileName: string) => string
  }
  app: {
    info: () => Promise<AppInfo>
    close: () => void
    minimize: () => void
    toggleFullscreen: () => void
    openGalleryDir: () => Promise<void>
  }
}

declare global {
  interface Window {
    api: DesktopApi
  }
}
