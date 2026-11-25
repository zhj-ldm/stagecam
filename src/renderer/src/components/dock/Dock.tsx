import { useState } from 'react'

import { Squircle } from '@renderer/components/Squircle'
import { Icon } from '@renderer/components/ui/Icon'
import { useAppStore } from '@renderer/store/use-app-store'
import { useGalleryStore } from '@renderer/store/use-gallery-store'

import { DockButton } from './DockButton'
import { EraserPopover } from './EraserPopover'
import { PenPopover, PopoverShell } from './PenPopover'

type OpenPopover = 'pen' | 'eraser' | null

const SEGMENT_WIDTH = 104

function ModeSegment(): JSX.Element {
  const mode = useAppStore((state) => state.mode)
  const setMode = useAppStore((state) => state.setMode)

  return (
    <div className="relative" style={{ width: SEGMENT_WIDTH }}>
      <Squircle radius={14} className="absolute inset-0 bg-white/8" />
      <Squircle
        radius={14}
        className="absolute inset-y-0 left-0 w-1/2 bg-white/18 transition-transform duration-200 ease-standard"
        style={{ transform: mode === 'annotate' ? 'translateX(100%)' : 'translateX(0)' }}
      />
      <div className="relative flex h-12">
        <button
          type="button"
          aria-pressed={mode === 'browse'}
          className={`flex h-full w-1/2 items-center justify-center gap-1.5 text-[13px] font-semibold tracking-wide transition-colors ${
            mode === 'browse' ? 'text-ink-1' : 'text-ink-3'
          }`}
          onClick={() => setMode('browse')}
        >
          <Icon name="browse" size={19} />
          浏览
        </button>
        <button
          type="button"
          aria-pressed={mode === 'annotate'}
          className={`flex h-full w-1/2 items-center justify-center gap-1.5 text-[13px] font-semibold tracking-wide transition-colors ${
            mode === 'annotate' ? 'text-ink-1' : 'text-ink-3'
          }`}
          onClick={() => setMode('annotate')}
        >
          <Icon name="pen" size={19} />
          批注
        </button>
      </div>
    </div>
  )
}

export function Dock(): JSX.Element {
  const [openPopover, setOpenPopover] = useState<OpenPopover>(null)

  const mode = useAppStore((state) => state.mode)
  const tool = useAppStore((state) => state.tool)
  const penColor = useAppStore((state) => state.penColor)
  const isFrozen = useAppStore((state) => Boolean(state.frozen))
  const isPhoto = useAppStore((state) => Boolean(state.photo))
  const freeze = useAppStore((state) => state.freeze)
  const unfreeze = useAppStore((state) => state.unfreeze)
  const setTool = useAppStore((state) => state.setTool)
  const rotate = useAppStore((state) => state.rotate)
  const backToLive = useAppStore((state) => state.backToLive)
  const capture = useGalleryStore((state) => state.capture)

  const annotating = mode === 'annotate'

  const toggleLock = async (): Promise<void> => {
    if (isPhoto) return
    if (isFrozen) unfreeze()
    else await freeze()
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="pointer-events-auto relative">
        <Squircle radius={28} className="glass absolute inset-0" />

        <div className="relative flex items-center gap-1 p-2">
          <ModeSegment />

          <div className="mx-1 h-9 w-px bg-white/10" />

          <div className="relative">
            <DockButton
              label="画笔"
              active={annotating && tool === 'pen'}
              disabled={!annotating}
              colorDot={penColor}
              onClick={() => {
                setTool('pen')
                setOpenPopover(openPopover === 'pen' ? null : 'pen')
              }}
            >
              <Icon name="pen" size={22} />
            </DockButton>
            {openPopover === 'pen' ? (
              <div className="absolute bottom-[calc(100%+14px)] left-1/2 -translate-x-1/2">
                <PopoverShell>
                  <PenPopover onClose={() => setOpenPopover(null)} />
                </PopoverShell>
              </div>
            ) : null}
          </div>

          <DockButton
            label={isFrozen ? '解除锁定' : '锁定画面'}
            active={isFrozen}
            disabled={isPhoto}
            onClick={() => void toggleLock()}
          >
            <Icon name={isFrozen ? 'lock' : 'unlock'} size={22} />
          </DockButton>

          <div className="relative">
            <DockButton
              label="橡皮"
              active={annotating && tool === 'eraser'}
              disabled={!annotating}
              onClick={() => {
                setTool('eraser')
                setOpenPopover(openPopover === 'eraser' ? null : 'eraser')
              }}
            >
              <Icon name="eraser" size={22} />
            </DockButton>
            {openPopover === 'eraser' ? (
              <div className="absolute bottom-[calc(100%+14px)] left-1/2 -translate-x-1/2">
                <PopoverShell>
                  <EraserPopover onClose={() => setOpenPopover(null)} />
                </PopoverShell>
              </div>
            ) : null}
          </div>

          <DockButton label="旋转画面" onClick={rotate}>
            <Icon name="rotate" size={22} />
          </DockButton>

          <div className="mx-1 h-9 w-px bg-white/10" />

          {isPhoto ? (
            <button
              type="button"
              onClick={backToLive}
              className="group relative h-12 shrink-0 text-white transition-opacity"
            >
              <Squircle
                radius={14}
                className="absolute inset-0 bg-[var(--color-primary)] transition-colors group-hover:bg-[var(--color-primary-hover)]"
              />
              <span className="relative flex h-full items-center gap-1.5 px-4 text-[14px] font-medium">
                <Icon name="live" size={18} />
                回到实时
              </span>
            </button>
          ) : (
            <button
              type="button"
              aria-label="拍照"
              onClick={() => void capture()}
              className="group relative h-12 w-12 shrink-0 text-white"
            >
              <Squircle
                radius={14}
                className="absolute inset-0 bg-[var(--color-primary)] transition-colors group-hover:bg-[var(--color-primary-hover)] group-active:bg-[var(--color-primary-active)]"
              />
              <span className="relative grid h-full w-full place-items-center">
                <Icon name="camera" size={23} />
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
