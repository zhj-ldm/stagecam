import type { ReactNode } from 'react'

import { Squircle } from '@renderer/components/Squircle'

interface DockButtonProps {
  label: string
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  children: ReactNode
  /** 右下角的小色块，用于画笔当前颜色 */
  colorDot?: string
  width?: number
}

/** 底栏按钮：一体成型、同一尺寸网格，选中态靠填充而非描边 */
export function DockButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
  colorDot,
  width = 48
}: DockButtonProps): JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className="group relative h-12 shrink-0 text-ink-2 transition-colors duration-150 disabled:text-ink-4"
      style={{ width }}
    >
      <Squircle
        radius={14}
        className={`absolute inset-0 transition-colors duration-150 ${
          active ? 'bg-white/16' : 'bg-transparent group-hover:bg-white/8 group-active:bg-white/14'
        }`}
      />
      <span className="relative grid h-full w-full place-items-center">{children}</span>
      {colorDot ? (
        <span
          className="absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full ring-1 ring-black/40"
          style={{ backgroundColor: colorDot }}
        />
      ) : null}
    </button>
  )
}
