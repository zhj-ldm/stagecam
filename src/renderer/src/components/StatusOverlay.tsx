import { useEffect, useState } from 'react'

import { Squircle } from '@renderer/components/Squircle'
import { Icon } from '@renderer/components/ui/Icon'
import { useCameraStore } from '@renderer/store/use-camera-store'
import { useGalleryStore } from '@renderer/store/use-gallery-store'
import { useAppStore } from '@renderer/store/use-app-store'

interface StatusOverlayProps {
  onRetry: () => void
}

/** 状态提示层：设备异常、锁定、查看照片、轻提示，全部以极轻的悬浮胶囊呈现 */
export function StatusOverlay({ onRetry }: StatusOverlayProps): JSX.Element {
  const status = useCameraStore((state) => state.status)
  const error = useCameraStore((state) => state.error)
  const isFrozen = useAppStore((state) => Boolean(state.frozen))
  const photo = useAppStore((state) => state.photo)
  const notice = useGalleryStore((state) => state.notice)
  const setNotice = useGalleryStore((state) => state.setNotice)
  const [lockHintVisible, setLockHintVisible] = useState(false)

  // 锁定提示只作一次性确认：出现约 1 秒后淡出，不常驻遮挡画面
  useEffect(() => {
    if (!isFrozen || photo) {
      setLockHintVisible(false)
      return undefined
    }
    setLockHintVisible(true)
    const timer = setTimeout(() => setLockHintVisible(false), 1000)
    return () => clearTimeout(timer)
  }, [isFrozen, photo])

  useEffect(() => {
    if (!notice) return undefined
    const timer = setTimeout(() => setNotice(null), 2400)
    return () => clearTimeout(timer)
  }, [notice, setNotice])

  return (
    <>
      {status === 'error' && error ? (
        <div className="pointer-events-none fixed inset-0 z-30 grid place-items-center">
          <Squircle radius={20} className="glass pointer-events-auto px-6 py-5 text-center">
            <p className="mb-1 text-[14px] text-ink-1">摄像头不可用</p>
            <p className="mb-4 max-w-[320px] text-[12px] leading-5 text-ink-3">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg bg-white/10 px-4 py-2 text-[12px] text-ink-1 transition-colors hover:bg-white/16"
            >
              重新检测
            </button>
          </Squircle>
        </div>
      ) : null}

      <div className="pointer-events-none fixed inset-x-0 top-4 z-30 flex flex-col items-center gap-2">
        {isFrozen && !photo ? (
          <Squircle
            radius={14}
            className={`glass flex items-center gap-1.5 px-3 py-1.5 transition-opacity duration-500 ${
              lockHintVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            <Icon name="lock" size={14} />
            <span className="text-[12px] text-ink-2">画面已锁定</span>
          </Squircle>
        ) : null}
        {photo ? (
          <Squircle radius={14} className="glass flex items-center gap-1.5 px-3 py-1.5">
            <Icon name="gallery" size={14} />
            <span className="text-[12px] text-ink-2">查看照片 · {photo.label}</span>
          </Squircle>
        ) : null}
      </div>

      {notice ? (
        <div className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center">
          <Squircle radius={16} className="glass px-4 py-2">
            <span className="text-[12px] text-ink-2">{notice}</span>
          </Squircle>
        </div>
      ) : null}
    </>
  )
}
