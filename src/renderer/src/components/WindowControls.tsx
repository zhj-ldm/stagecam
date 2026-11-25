import { Icon } from '@renderer/components/ui/Icon'
import { useAppStore } from '@renderer/store/use-app-store'

/** 自绘窗口控件：常驻左上角，保证随时能关窗，同时不引入系统标题栏 */
export function WindowControls(): JSX.Element {
  const mode = useAppStore((state) => state.mode)

  return (
    <>
      <div
        className="fixed inset-x-0 top-0 z-20 h-6"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />
      <div
        className={`fixed left-4 top-4 z-40 flex gap-2 ${mode === 'annotate' ? 'opacity-30' : ''}`}
      >
        <button
          type="button"
          aria-label="关闭"
          onClick={() => window.api.app.close()}
          className="group grid h-[13px] w-[13px] place-items-center rounded-full bg-[#FF5F57] text-transparent transition-colors hover:text-black/60"
        >
          <Icon name="close" size={8} />
        </button>
        <button
          type="button"
          aria-label="最小化"
          onClick={() => window.api.app.minimize()}
          className="group grid h-[13px] w-[13px] place-items-center rounded-full bg-[#FEBC2E] text-transparent transition-colors hover:text-black/60"
        >
          <Icon name="minimize" size={8} />
        </button>
        <button
          type="button"
          aria-label="全屏"
          onClick={() => window.api.app.toggleFullscreen()}
          className="group grid h-[13px] w-[13px] place-items-center rounded-full bg-[#28C840] text-transparent transition-colors hover:text-black/60"
        >
          <Icon name="expand" size={8} />
        </button>
      </div>
    </>
  )
}
