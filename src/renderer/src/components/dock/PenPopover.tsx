import { useRef, useState } from 'react'

import { Squircle } from '@renderer/components/Squircle'
import { hexToHsv, hsvToHex } from '@renderer/lib/color'
import { useAppStore } from '@renderer/store/use-app-store'

const PRESET_COLORS = ['#F53F3F', '#FF7D00', '#FADC19', '#00B42A', '#165DFF', '#0FC6C2', '#1D2129']

interface SpectrumProps {
  color: string;
  /** 拖动过程只做本地面板预览，抬手才落库，避免每帧写设置 */
  onPreview: (hex: string) => void
  onCommit: (hex: string) => void
}

/** 全色域取色：上方二维色域（横向饱和度、纵向明度），下方色相条 */
function ColorSpectrum({ color, onPreview, onCommit }: SpectrumProps): JSX.Element {
  const initial = hexToHsv(color)
  const [hue, setHue] = useState(initial.h)
  const [point, setPoint] = useState({ x: initial.s, y: 1 - initial.v })
  const draggingRef = useRef<'field' | 'hue' | null>(null)
  const fieldRef = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)

  const emit = (s: number, v: number, h: number, final: boolean): void => {
    const hex = hsvToHex(h, s, v)
    onPreview(hex)
    if (final) onCommit(hex)
  }

  const handleField = (clientX: number, clientY: number, final: boolean): void => {
    const box = fieldRef.current?.getBoundingClientRect()
    if (!box) return
    const x = Math.min(1, Math.max(0, (clientX - box.left) / box.width))
    const y = Math.min(1, Math.max(0, (clientY - box.top) / box.height))
    setPoint({ x, y })
    emit(x, 1 - y, hue, final)
  }

  const handleHue = (clientX: number, final: boolean): void => {
    const box = hueRef.current?.getBoundingClientRect()
    if (!box) return
    const x = Math.min(1, Math.max(0, (clientX - box.left) / box.width))
    const nextHue = x * 360
    setHue(nextHue)
    emit(point.x, 1 - point.y, nextHue, final)
  }

  const pointerDown = (kind: 'field' | 'hue') => (event: React.PointerEvent) => {
    event.stopPropagation()
    draggingRef.current = kind
    const el = event.currentTarget as HTMLElement
    el.setPointerCapture(event.pointerId)
    if (kind === 'field') handleField(event.clientX, event.clientY, false)
    else handleHue(event.clientX, false)
  }

  const pointerMove = (kind: 'field' | 'hue') => (event: React.PointerEvent) => {
    if (draggingRef.current !== kind) return
    if (kind === 'field') handleField(event.clientX, event.clientY, false)
    else handleHue(event.clientX, false)
  }

  const pointerUp = (kind: 'field' | 'hue') => () => {
    if (draggingRef.current !== kind) return
    draggingRef.current = null
    emit(point.x, 1 - point.y, hue, true)
  }

  return (
    <div className="mt-3 select-none" onPointerDown={(event) => event.stopPropagation()}>
      <div
        ref={fieldRef}
        className="relative h-[120px] w-full cursor-crosshair overflow-hidden rounded-[12px]"
        style={{
          background: `linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #FFF, ${hsvToHex(
            hue,
            1,
            1
          )})`,
          touchAction: 'none'
        }}
        onPointerDown={pointerDown('field')}
        onPointerMove={pointerMove('field')}
        onPointerUp={pointerUp('field')}
        onPointerCancel={pointerUp('field')}
      >
        <span
          className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80"
          style={{
            left: `${point.x * 100}%`,
            top: `${point.y * 100}%`,
            backgroundColor: hsvToHex(hue, point.x, 1 - point.y),
            boxShadow: '0 0 0 1.5px rgba(0,0,0,0.35)'
          }}
        />
      </div>

      <div
        ref={hueRef}
        className="relative mt-3 h-4 w-full cursor-pointer overflow-hidden rounded-full"
        style={{
          background:
            'linear-gradient(to right, #F00, #FF0 16.6%, #0F0 33.3%, #0FF 50%, #00F 66.6%, #F0F 83.3%, #F00)',
          touchAction: 'none'
        }}
        onPointerDown={pointerDown('hue')}
        onPointerMove={pointerMove('hue')}
        onPointerUp={pointerUp('hue')}
        onPointerCancel={pointerUp('hue')}
      >
        <span
          className="pointer-events-none absolute top-0 h-full w-2.5 -translate-x-1/2 rounded-full border border-white/70"
          style={{ left: `${(hue / 360) * 100}%`, backgroundColor: `hsl(${hue} 100% 50%)` }}
        />
      </div>
    </div>
  )
}

interface PenPopoverProps {
  onClose: () => void
}

export function PenPopover({ onClose }: PenPopoverProps): JSX.Element {
  const penColor = useAppStore((state) => state.penColor)
  const penWidth = useAppStore((state) => state.penWidth)
  const setPenColor = useAppStore((state) => state.setPenColor)
  const setPenWidth = useAppStore((state) => state.setPenWidth)
  const [spectrumOpen, setSpectrumOpen] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const shown = preview ?? penColor

  return (
    <div className="w-[252px]" onPointerDown={(event) => event.stopPropagation()}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] text-ink-2">画笔</span>
        <button
          type="button"
          className="text-[12px] text-ink-3 transition-colors hover:text-ink-1"
          onClick={onClose}
        >
          收起
        </button>
      </div>

      <div className="grid grid-cols-8 gap-1.5">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`颜色 ${color}`}
            className="grid h-7 w-7 place-items-center"
            onClick={() => {
              setPreview(null)
              setSpectrumOpen(false)
              setPenColor(color)
            }}
          >
            <span
              className="block h-[22px] w-[22px] rounded-full transition-transform"
              style={{
                backgroundColor: color,
                transform: penColor === color ? 'scale(1)' : 'scale(0.86)',
                boxShadow: penColor === color ? '0 0 0 2px rgba(255,255,255,0.85)' : 'none'
              }}
            />
          </button>
        ))}
        <button
          type="button"
          aria-label="自定义颜色"
          className="grid h-7 w-7 place-items-center"
          onClick={() => setSpectrumOpen((open) => !open)}
        >
          <span
            className="grid h-[22px] w-[22px] place-items-center rounded-full transition-transform"
            style={{
              background:
                'conic-gradient(#FF3B30,#FF9500,#FFCC00,#32D74B,#0A84FF,#BF5AF2,#FF3B30)',
              transform: spectrumOpen ? 'scale(1)' : 'scale(0.86)',
              boxShadow: spectrumOpen ? '0 0 0 2px rgba(255,255,255,0.85)' : 'none'
            }}
          >
            {spectrumOpen ? (
              <span
                className="h-2 w-2 rounded-full ring-1 ring-white/70"
                style={{ backgroundColor: penColor }}
              />
            ) : null}
          </span>
        </button>
      </div>

      {spectrumOpen ? (
        <ColorSpectrum
          color={penColor}
          onPreview={setPreview}
          onCommit={(hex) => {
            setPreview(null)
            setPenColor(hex)
          }}
        />
      ) : null}

      <div className="mb-1 mt-3 flex items-center justify-between text-[12px] text-ink-3">
        <span>粗细</span>
        <span className="tabular-nums text-ink-2">{penWidth} px</span>
      </div>
      <input
        type="range"
        min={1}
        max={24}
        step={1}
        value={penWidth}
        onChange={(event) => setPenWidth(Number(event.target.value))}
        className="w-full accent-[var(--color-primary)]"
      />

      <div className="mt-3 flex items-center gap-2">
        <span
          className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/25"
          style={{ backgroundColor: shown }}
        />
        <div className="h-9 flex-1 rounded-md bg-white/6 p-2">
          <div
            className="rounded-full"
            style={{ height: `${Math.max(2, penWidth)}px`, backgroundColor: shown, width: '100%' }}
          />
        </div>
      </div>
    </div>
  )
}

export function PopoverShell({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <Squircle radius={20} className="glass p-4 shadow-[0_18px_48px_rgba(0,0,0,0.42)]">
      {children}
    </Squircle>
  )
}
