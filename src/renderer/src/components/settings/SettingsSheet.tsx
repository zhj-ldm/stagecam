import { useEffect, useState } from 'react'

import { Squircle } from '@renderer/components/Squircle'
import { Icon } from '@renderer/components/ui/Icon'
import { useAppStore } from '@renderer/store/use-app-store'
import { useCameraStore } from '@renderer/store/use-camera-store'
import { useGalleryStore } from '@renderer/store/use-gallery-store'
import type { AppInfo, AppSettings } from '@shared/types'

interface SettingsSheetProps {
  onSelectDevice: (deviceId: string) => Promise<void>
}

function Row({
  title,
  description,
  children
}: {
  title: string
  description?: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <div className="border-b border-white/6 py-3.5 last:border-none">
      <div className="mb-2 text-[13px] text-ink-1">{title}</div>
      {description ? <div className="mb-2 text-[11px] leading-5 text-ink-4">{description}</div> : null}
      {children}
    </div>
  )
}

export function SettingsSheet({ onSelectDevice }: SettingsSheetProps): JSX.Element | null {
  const open = useGalleryStore((state) => state.settingsOpen)
  const setOpen = useGalleryStore((state) => state.setSettingsOpen)
  const loadGallery = useGalleryStore((state) => state.load)
  const devices = useCameraStore((state) => state.devices)
  const activeId = useCameraStore((state) => state.activeId)

  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [info, setInfo] = useState<AppInfo | null>(null)

  useEffect(() => {
    if (!open) return
    void window.api.settings.get().then(setSettings)
    void window.api.app.info().then(setInfo)
  }, [open])

  if (!open) return null

  const patch = async (value: Partial<AppSettings>): Promise<void> => {
    const next = await window.api.settings.patch(value)
    setSettings(next)
  }

  const changeDir = async (): Promise<void> => {
    const dir = await window.api.settings.pickGalleryDir()
    if (!dir) return
    await patch({ galleryDir: dir })
    await loadGallery()
  }

  const reset = async (): Promise<void> => {
    const next = await window.api.settings.reset()
    setSettings(next)
    useAppStore.getState().setPenColor(next.penColor)
    useAppStore.getState().setPenWidth(next.penWidth)
    useAppStore.getState().setEraserWidth(next.eraserWidth)
    await loadGallery()
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 backdrop-blur-[3px]"
      onPointerDown={() => setOpen(false)}
    >
      <div onPointerDown={(event) => event.stopPropagation()}>
        <Squircle radius={28} className="glass-panel w-[520px] px-6 py-5 shadow-[0_28px_80px_rgba(0,0,0,0.55)]">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[15px] text-ink-1">设置</span>
            <button
              type="button"
              aria-label="关闭设置"
              onClick={() => setOpen(false)}
              className="grid h-8 w-8 place-items-center text-ink-3 transition-colors hover:text-ink-1"
            >
              <Icon name="close" size={18} />
            </button>
          </div>

          <Row title="相册存储位置" description="新拍的照片会写入该目录，已有照片不会被移动。">
            <div className="flex items-center gap-2">
              <div className="flex-1 truncate rounded-md bg-white/6 px-2.5 py-2 text-[12px] text-ink-2">
                {settings?.galleryDir ?? '读取中…'}
              </div>
              <button
                type="button"
                onClick={() => void changeDir()}
                className="rounded-md bg-white/10 px-2.5 py-2 text-[12px] text-ink-1 transition-colors hover:bg-white/16"
              >
                更改
              </button>
              <button
                type="button"
                aria-label="在文件管理器中打开"
                onClick={() => void window.api.app.openGalleryDir()}
                className="grid h-9 w-9 place-items-center rounded-md bg-white/10 text-ink-2 transition-colors hover:bg-white/16 hover:text-ink-1"
              >
                <Icon name="folder" size={16} />
              </button>
            </div>
          </Row>

          <Row title="摄像头" description="启动时自动选择展台设备；接多路摄像头时可在此切换。">
            <select
              value={activeId ?? ''}
              onChange={(event) => void onSelectDevice(event.target.value)}
              className="w-full rounded-md bg-white/8 px-2.5 py-2 text-[12px] text-ink-1 outline-none"
            >
              {devices.length === 0 ? <option value="">未检测到设备</option> : null}
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId} className="bg-[#14161b]">
                  {device.label}
                </option>
              ))}
            </select>
          </Row>

          <Row title="画笔默认" description="颜色与粗细会随使用自动记忆。">
            <div className="flex items-center gap-3 text-[12px] text-ink-2">
              <span className="tabular-nums">粗细 {settings?.penWidth ?? '—'} px</span>
              <span className="tabular-nums">橡皮 {settings?.eraserWidth ?? '—'} px</span>
              <button
                type="button"
                onClick={() => void reset()}
                className="ml-auto rounded-md bg-white/10 px-2.5 py-1.5 text-[12px] text-ink-2 transition-colors hover:bg-white/16 hover:text-ink-1"
              >
                恢复默认
              </button>
            </div>
          </Row>

          <Row title="关于">
            <div className="space-y-1 text-[11px] leading-5 text-ink-3">
              <p>版本 {info?.version ?? '—'} · {info?.platform ?? '—'}</p>
              <p>摄像头协议：UVC 标准视频类，系统相机可直接识别</p>
              <p className="truncate">默认目录 {info?.defaultGalleryDir ?? '—'}</p>
            </div>
          </Row>
        </Squircle>
      </div>
    </div>
  )
}
