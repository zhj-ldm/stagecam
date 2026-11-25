import { useState } from 'react'

import { Squircle } from '@renderer/components/Squircle'
import { Icon } from '@renderer/components/ui/Icon'
import { useGalleryStore } from '@renderer/store/use-gallery-store'
import type { GalleryItem } from '@shared/types'

function timeLabel(createdAt: number): string {
  const date = new Date(createdAt)
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

interface ThumbProps {
  item: GalleryItem
  selecting: boolean
  selected: boolean
  onOpen: () => void
  onToggle: () => void
}

function Thumb({ item, selecting, selected, onOpen, onToggle }: ThumbProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={selecting ? onToggle : onOpen}
      className="group relative block w-full overflow-hidden text-left"
    >
      <Squircle radius={14} className="overflow-hidden bg-white/8">
        <div className="aspect-[4/3] w-full overflow-hidden">
          <img
            src={window.api.gallery.urlOf(item.fileName)}
            alt={timeLabel(item.createdAt)}
            className="h-full w-full object-cover"
            draggable={false}
          />
        </div>
        {selected ? (
          <span className="absolute inset-0 grid place-items-center bg-black/45">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--color-primary)] text-white">
              <Icon name="check" size={14} />
            </span>
          </span>
        ) : null}
      </Squircle>
      <div className="mt-1 flex items-center justify-between px-0.5 text-[11px] text-ink-3">
        <span className="tabular-nums">{timeLabel(item.createdAt)}</span>
        {selecting ? (
          <span
            className={`h-3.5 w-3.5 rounded-full border ${
              selected
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                : 'border-white/30'
            }`}
          />
        ) : null}
      </div>
    </button>
  )
}

/** 贴边半圆把手：凸面永远朝画面，平的一侧贴住窗口边缘或侧边栏 */
function EdgeTab({
  label,
  onClick,
  badge,
  children
}: {
  label: string
  onClick: () => void
  badge?: boolean
  children: JSX.Element
}): JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="relative flex h-[72px] w-[22px] items-center justify-center text-ink-2 transition-colors hover:text-ink-1"
      style={{
        borderTopLeftRadius: 9999,
        borderBottomLeftRadius: 9999,
        background: 'linear-gradient(90deg, rgba(20,24,32,0.82), rgba(20,24,32,0.94))',
        backdropFilter: 'blur(16px) saturate(1.2)',
        borderLeft: '1px solid rgba(255,255,255,0.10)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '-8px 0 18px rgba(0,0,0,0.28)'
      }}
    >
      {children}
      {badge ? (
        <span className="absolute right-1 top-2 h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
      ) : null}
    </button>
  )
}

export function GallerySidebar(): JSX.Element {
  const items = useGalleryStore((state) => state.items)
  const open = useGalleryStore((state) => state.sidebarOpen)
  const selecting = useGalleryStore((state) => state.selecting)
  const selectedIds = useGalleryStore((state) => state.selectedIds)
  const setOpen = useGalleryStore((state) => state.setSidebarOpen)
  const toggleSelecting = useGalleryStore((state) => state.toggleSelecting)
  const toggleSelected = useGalleryStore((state) => state.toggleSelected)
  const deleteSelected = useGalleryStore((state) => state.deleteSelected)
  const openItem = useGalleryStore((state) => state.openItem)
  const setSettingsOpen = useGalleryStore((state) => state.setSettingsOpen)
  const [confirming, setConfirming] = useState(false)

  return (
    <>
      {/* 收起态：半圆把手嵌在窗口最右边，箭头朝左；空相册也能点开 */}
      {!open ? (
        <div className="fixed right-0 top-1/2 z-30 -translate-y-1/2">
          <EdgeTab label="打开相册" onClick={() => setOpen(true)} badge={items.length > 0}>
            <Icon name="chevronLeft" size={15} />
          </EdgeTab>
        </div>
      ) : null}

      <aside
        className={`fixed bottom-0 right-0 top-0 z-30 w-[280px] p-3 transition-transform duration-300 ease-standard ${
          open ? '' : 'pointer-events-none'
        }`}
        style={{ transform: open ? 'translateX(0)' : 'translateX(100%)' }}
        aria-hidden={!open}
      >
        <Squircle radius={24} className="glass flex h-full w-full flex-col overflow-hidden">
          <header className="flex items-center justify-between px-4 pb-2 pt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-semibold text-ink-1">相册</span>
              <span className="tabular-nums text-[11px] text-ink-3">{items.length}</span>
            </div>
            {items.length > 0 ? (
              <button
                type="button"
                className="px-2 py-1 text-[12px] text-ink-3 transition-colors hover:text-ink-1"
                onClick={() => {
                  setConfirming(false)
                  toggleSelecting()
                }}
              >
                {selecting ? '完成' : '选择'}
              </button>
            ) : null}
          </header>

          <div
            className="flex-1 overflow-y-auto overscroll-contain px-3 pb-3"
            style={{ scrollbarWidth: 'none' }}
          >
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-ink-4">
                <Icon name="gallery" size={26} />
                <p className="text-[12px] leading-5">
                  还没有照片
                  <br />
                  点底栏相机即可拍摄
                </p>
              </div>
            ) : (
              /* 一行一张：照片铺满栏宽，最新在最上，超出可滚动 */
              <div className="flex flex-col gap-2.5">
                {items.map((item) => (
                  <Thumb
                    key={item.id}
                    item={item}
                    selecting={selecting}
                    selected={selectedIds.includes(item.id)}
                    onOpen={() => void openItem(item)}
                    onToggle={() => toggleSelected(item.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <footer className="border-t border-white/8 px-3 py-3">
            {selecting ? (
              confirming ? (
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-[12px] text-ink-2">
                    删除 {selectedIds.length} 张？
                  </span>
                  <button
                    type="button"
                    className="rounded-md px-2 py-1 text-[12px] text-ink-3 hover:text-ink-1"
                    onClick={() => setConfirming(false)}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-[var(--color-error)] px-2.5 py-1 text-[12px] text-white disabled:opacity-40"
                    disabled={selectedIds.length === 0}
                    onClick={() => {
                      void deleteSelected().then(() => setConfirming(false))
                    }}
                  >
                    删除
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={selectedIds.length === 0}
                  onClick={() => setConfirming(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-[12px] text-ink-2 transition-colors hover:text-[var(--color-error)] disabled:text-ink-4"
                >
                  <Icon name="trash" size={16} />
                  删除所选
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-[12px] text-ink-3 transition-colors hover:text-ink-1"
              >
                <Icon name="more" size={16} />
                设置
              </button>
            )}
          </footer>
        </Squircle>

        {/* 展开态：同一个半圆把手（凸面依旧朝画面），平的一侧贴住面板左缘，箭头朝右。
            收起时必须彻底隐藏：它挂在面板左侧，面板滑出屏幕后它会露在窗口最右边，
            和收起态的把手叠成两个半圆。 */}
        <div
          className={`absolute left-3 top-1/2 z-10 -translate-x-full -translate-y-1/2 transition-opacity duration-200 ${
            open ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <EdgeTab label="收起相册" onClick={() => setOpen(false)}>
            <Icon name="chevronRight" size={15} />
          </EdgeTab>
        </div>
      </aside>
    </>
  )
}
