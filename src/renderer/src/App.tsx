import { useCallback, useEffect, useRef } from 'react'

import { Dock } from '@renderer/components/dock/Dock'
import { SettingsSheet } from '@renderer/components/settings/SettingsSheet'
import { GallerySidebar } from '@renderer/components/sidebar/GallerySidebar'
import { StageView } from '@renderer/components/StageView'
import { StatusOverlay } from '@renderer/components/StatusOverlay'
import { WindowControls } from '@renderer/components/WindowControls'
import { useCamera } from '@renderer/hooks/use-camera'
import { useAppStore } from '@renderer/store/use-app-store'
import { useCameraStore } from '@renderer/store/use-camera-store'
import { useGalleryStore } from '@renderer/store/use-gallery-store'
import type { Rotation } from '@renderer/lib/geometry'
import type { UiMode } from '@shared/types'

function App(): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { start } = useCamera(videoRef)

  const boot = useCallback(async (): Promise<void> => {
    const settings = await window.api.settings.get()
    useAppStore.setState({
      penColor: settings.penColor,
      penWidth: settings.penWidth,
      eraserWidth: settings.eraserWidth,
      rotation: ([0, 90, 180, 270].includes(settings.rotation)
        ? settings.rotation
        : 0) as Rotation,
      uiMode: (settings.uiMode === 'normal' ? 'normal' : 'sped') as UiMode,
      mode: settings.uiMode === 'normal' ? useAppStore.getState().mode : 'browse'
    })
    useAppStore.getState().setVideoEl(videoRef.current)
    await start(settings.deviceId)
    // 记忆的设备可能已拔掉：失败则回落到自动选择，保证打开即出图
    if (settings.deviceId && useCameraStore.getState().status === 'error') {
      await start(null)
    }
    await useGalleryStore.getState().load()
  }, [start])

  useEffect(() => {
    void boot()
  }, [boot])

  const selectDevice = useCallback(
    async (deviceId: string): Promise<void> => {
      await window.api.settings.patch({ deviceId })
      await start(deviceId)
      if (useCameraStore.getState().status === 'error') await start(null)
    },
    [start]
  )

  // 全局快捷键：撤销、退出查看照片、关闭面板
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const app = useAppStore.getState()
      const gallery = useGalleryStore.getState()

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        app.undo()
        return
      }

      if (event.key === 'Escape') {
        if (gallery.settingsOpen) {
          gallery.setSettingsOpen(false)
          return
        }
        if (app.photo) {
          app.backToLive()
          return
        }
        if (gallery.sidebarOpen) gallery.setSidebarOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#05060a] text-ink-2">
      {/* 真实取流元素：只用于解码，可见画面由 WebGL 层绘制 */}
      <video
        ref={videoRef}
        className="pointer-events-none absolute h-px w-px opacity-0"
        muted
        playsInline
        autoPlay
      />

      <StageView />
      <WindowControls />
      <StatusOverlay onRetry={() => void start(null)} />
      <Dock />
      <GallerySidebar />
      <SettingsSheet onSelectDevice={selectDevice} />
    </div>
  )
}

export default App
