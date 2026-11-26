import { Squircle } from '@renderer/components/Squircle'
import { Icon, type IconName } from '@renderer/components/ui/Icon'
import { useAppStore } from '@renderer/store/use-app-store'
import { useGalleryStore } from '@renderer/store/use-gallery-store'

/** 特供模式按钮尺寸：完整底栏 64px 的 3/4 = 48px，按钮直接顶满这个高度 */
const BUTTON_SIZE = 48
/** 圆角拉满（48px 时半径 24），按钮干脆就是一个整圆 */
const BUTTON_RADIUS = BUTTON_SIZE / 2

function ActionButton({
  label,
  icon,
  onClick,
  primary = false,
  danger = false
}: {
  label: string
  icon: IconName
  onClick: () => void
  primary?: boolean
  danger?: boolean
}): JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="group relative shrink-0"
      style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}
    >
      <Squircle
        radius={BUTTON_RADIUS}
        className={
          primary
            ? 'absolute inset-0 bg-[var(--color-primary)] transition-colors group-hover:bg-[var(--color-primary-hover)] group-active:bg-[var(--color-primary-active)]'
            : 'glass absolute inset-0 transition-colors group-hover:bg-white/14'
        }
      />
      <span
        className={`relative grid h-full w-full place-items-center ${
          primary ? 'text-white' : danger ? 'text-ink-3 group-hover:text-[#FF6B6B]' : 'text-ink-1'
        }`}
      >
        <Icon name={icon} size={22} />
      </span>
    </button>
  )
}

/**
 * 特供模式（配合教室那套讯飞自带画笔）：
 * 不提供画笔 / 橡皮 / 批注，只剩「锁定 / 旋转 / 拍照（回到实时）/ 退出」。
 * 仍然是贴底的横向一排按钮，整体靠到屏幕左侧；每个按钮顶满底栏高度，
 * 彼此留一点间距、各自独立悬浮，圆角接近半圆。
 */
export function SpedDock(): JSX.Element {
  const isFrozen = useAppStore((state) => Boolean(state.frozen))
  const isPhoto = useAppStore((state) => Boolean(state.photo))
  const freeze = useAppStore((state) => state.freeze)
  const unfreeze = useAppStore((state) => state.unfreeze)
  const backToLive = useAppStore((state) => state.backToLive)
  const rotate = useAppStore((state) => state.rotate)
  const capture = useGalleryStore((state) => state.capture)

  const toggleLock = async (): Promise<void> => {
    if (isPhoto) return
    if (isFrozen) unfreeze()
    else await freeze()
  }

  return (
    <div
      className="pointer-events-none fixed bottom-0 left-0 z-30"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="pointer-events-auto flex flex-row items-end gap-2">
        <ActionButton label="退出程序" icon="close" danger onClick={() => window.api.app.close()} />
        <ActionButton label="旋转画面" icon="rotate" onClick={rotate} />
        <ActionButton
          label={isFrozen ? '解除锁定' : '锁定画面'}
          icon={isFrozen ? 'lock' : 'unlock'}
          onClick={() => void toggleLock()}
        />
        {isPhoto ? (
          <ActionButton label="回到实时" icon="live" primary onClick={backToLive} />
        ) : (
          <ActionButton label="拍照" icon="camera" primary onClick={() => void capture()} />
        )}
      </div>
    </div>
  )
}
