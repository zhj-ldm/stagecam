import { useState } from 'react'

import { useAppStore } from '@renderer/store/use-app-store'

const CLEAR_THRESHOLD = 96

interface EraserPopoverProps {
  onClose: () => void
}

export function EraserPopover({ onClose }: EraserPopoverProps): JSX.Element {
  const eraserWidth = useAppStore((state) => state.eraserWidth)
  const setEraserWidth = useAppStore((state) => state.setEraserWidth)
  const eraseAll = useAppStore((state) => state.eraseAll)
  const [clearProgress, setClearProgress] = useState(0)

  const handleClear = (value: number): void => {
    if (value >= CLEAR_THRESHOLD) {
      eraseAll()
      setClearProgress(0)
      onClose()
      return
    }
    setClearProgress(value)
  }

  return (
    <div className="w-[248px]" onPointerDown={(event) => event.stopPropagation()}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] text-ink-2">橡皮</span>
        <button
          type="button"
          className="text-[12px] text-ink-3 transition-colors hover:text-ink-1"
          onClick={onClose}
        >
          收起
        </button>
      </div>

      <div className="mb-1 flex items-center justify-between text-[12px] text-ink-3">
        <span>大小</span>
        <span className="tabular-nums text-ink-2">{eraserWidth} px</span>
      </div>
      <input
        type="range"
        min={6}
        max={120}
        step={2}
        value={eraserWidth}
        onChange={(event) => setEraserWidth(Number(event.target.value))}
        className="w-full accent-[var(--color-primary)]"
      />

      <div className="my-3 h-px w-full bg-white/8" />

      <div className="mb-1 flex items-center justify-between text-[12px] text-ink-3">
        <span>滑动全擦</span>
        <span className="tabular-nums text-ink-2">{clearProgress}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={clearProgress}
        onChange={(event) => handleClear(Number(event.target.value))}
        onPointerUp={() => setClearProgress(0)}
        className="w-full accent-[var(--color-error)]"
      />
      <p className="mt-2 text-[11px] leading-5 text-ink-4">滑到底即清除当前画面的全部批注</p>
    </div>
  )
}
