import { useEffect, useRef } from 'react'

import { useStagePointer } from '@renderer/hooks/use-stage-pointer'
import { imageRect, type Rect } from '@renderer/lib/geometry'
import { ImageRenderer } from '@renderer/lib/image-renderer'
import { InkEngine } from '@renderer/lib/ink-engine'
import { setStageMetrics, useAppStore } from '@renderer/store/use-app-store'
import { useCameraStore } from '@renderer/store/use-camera-store'

interface Size {
  w: number
  h: number
}

function resolveImageSize(): Size {
  const app = useAppStore.getState()
  if (app.photo) return { w: app.photo.bitmap.width, h: app.photo.bitmap.height }
  if (app.frozen) return { w: app.frozen.width, h: app.frozen.height }
  const camera = useCameraStore.getState()
  if (camera.frameWidth > 0) return { w: camera.frameWidth, h: camera.frameHeight }
  return { w: 1920, h: 1080 }
}

export function StageView(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const glCanvasRef = useRef<HTMLCanvasElement>(null)
  const committedRef = useRef<HTMLCanvasElement>(null)
  const eraserRingRef = useRef<HTMLDivElement>(null)
  const liveRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<ImageRenderer | null>(null)
  const engineRef = useRef<InkEngine | null>(null)
  const viewportRef = useRef<Size>({ w: 1, h: 1 })
  const imageSizeRef = useRef<Size>({ w: 1920, h: 1080 })
  const rectRef = useRef<Rect | null>(null)
  const inkStateRef = useRef({ version: -1, doc: '', w: 0, h: 0 })
  const uploadNeededRef = useRef(true)
  const videoDirtyRef = useRef(true)

  const pointer = useStagePointer(containerRef, () => rectRef.current, engineRef)

  const photo = useAppStore((state) => state.photo)
  const frozen = useAppStore((state) => state.frozen)
  const videoEl = useAppStore((state) => state.videoEl)
  const mode = useAppStore((state) => state.mode)
  const tool = useAppStore((state) => state.tool)
  const frameWidth = useCameraStore((state) => state.frameWidth)

  useEffect(() => {
    setStageMetrics(
      () => ({ w: viewportRef.current.w, h: viewportRef.current.h }),
      () => imageSizeRef.current
    )
    if (committedRef.current && liveRef.current) {
      const engine = new InkEngine()
      engine.setSurface(committedRef.current, liveRef.current)
      engineRef.current = engine
    }
  }, [])

  // 橡皮擦范围圈：直接跟随原始指针事件定位，不与 React 渲染耦合
  useEffect(() => {
    const container = containerRef.current
    const ring = eraserRingRef.current
    if (!container || !ring) return undefined

    const place = (x: number, y: number): void => {
      const app = useAppStore.getState()
      const rect = rectRef.current
      if (app.mode !== 'annotate' || app.tool !== 'eraser' || !rect) {
        ring.style.opacity = '0'
        return
      }
      const d = Math.max(10, app.eraserWidth * (rect.w / 1920))
      ring.style.width = `${d}px`
      ring.style.height = `${d}px`
      ring.style.opacity = '1'
      ring.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
    }

    const onPointer = (event: PointerEvent): void => place(event.clientX, event.clientY)
    const onLeave = (): void => {
      ring.style.opacity = '0'
    }

    container.addEventListener('pointermove', onPointer)
    container.addEventListener('pointerrawupdate', onPointer as EventListener)
    container.addEventListener('pointerdown', onPointer)
    container.addEventListener('pointerleave', onLeave)
    return () => {
      container.removeEventListener('pointermove', onPointer)
      container.removeEventListener('pointerrawupdate', onPointer as EventListener)
      container.removeEventListener('pointerdown', onPointer)
      container.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  useEffect(() => {
    if (mode === 'annotate' && tool === 'eraser') return
    if (eraserRingRef.current) eraserRingRef.current.style.opacity = '0'
  }, [mode, tool])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined
    const observer = new ResizeObserver(() => {
      const box = container.getBoundingClientRect()
      viewportRef.current = { w: Math.max(1, box.width), h: Math.max(1, box.height) }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // 只有真正出新帧才上传纹理：避免 60fps 主循环里反复搬运 4K 帧
  useEffect(() => {
    if (!videoEl) return undefined
    videoDirtyRef.current = true
    uploadNeededRef.current = true
    let handle = 0
    const onFrame = (): void => {
      videoDirtyRef.current = true
      if ('requestVideoFrameCallback' in videoEl) {
        handle = videoEl.requestVideoFrameCallback(onFrame)
      }
    }
    if ('requestVideoFrameCallback' in videoEl) {
      handle = videoEl.requestVideoFrameCallback(onFrame)
    }
    return () => {
      if (handle && 'cancelVideoFrameCallback' in videoEl) {
        videoEl.cancelVideoFrameCallback(handle)
      }
    }
  }, [videoEl])

  useEffect(() => {
    uploadNeededRef.current = true
  }, [photo, frozen, frameWidth, mode])

  useEffect(() => {
    let raf = 0
    const frame = (): void => {
      raf = requestAnimationFrame(frame)
      const canvas = glCanvasRef.current
      if (!canvas || !committedRef.current || !liveRef.current) return

      if (!rendererRef.current) {
        try {
          rendererRef.current = new ImageRenderer(canvas)
        } catch {
          return
        }
      }
      const renderer = rendererRef.current
      const app = useAppStore.getState()
      const viewport = viewportRef.current
      const dpr = window.devicePixelRatio || 1
      const image = resolveImageSize()
      imageSizeRef.current = image

      renderer.resize(viewport.w, viewport.h, dpr)
      const rect = imageRect(image.w, image.h, viewport.w, viewport.h, app.view)
      rectRef.current = rect

      const source: TexImageSource | null = app.photo?.bitmap ?? app.frozen ?? app.videoEl ?? null
      const ready = Boolean(app.photo ?? app.frozen) || (app.videoEl?.readyState ?? 0) >= 2
      if (source && ready) {
        if (uploadNeededRef.current || videoDirtyRef.current) {
          try {
            renderer.upload(source)
            uploadNeededRef.current = false
            videoDirtyRef.current = false
          } catch {
            // 视频帧切换瞬间可能上传失败，下一帧自动恢复
          }
        }
        renderer.draw(rect, viewport.w, viewport.h)
      }

      const engine = engineRef.current
      if (!engine) return
      engine.resize(viewport.w, viewport.h, dpr)

      const docKey = app.docKey()
      const state = inkStateRef.current
      if (state.version !== app.inkVersion || state.doc !== docKey) {
        inkStateRef.current = { version: app.inkVersion, doc: docKey, w: image.w, h: image.h }
        engine.redraw(app.currentStrokes())
      }
      // 笔迹按屏幕分辨率栅格化，平移时只贴图：既清晰又与底图同帧移动
      engine.setRect(rect)
      engine.compose()
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden bg-[#05060a] ${
        mode === 'annotate' ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
      }`}
      style={{ touchAction: 'none' }}
      {...pointer}
    >
      <canvas ref={glCanvasRef} className="absolute inset-0 h-full w-full" />
      <canvas
        ref={committedRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      <canvas ref={liveRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      <div
        ref={eraserRingRef}
        className="pointer-events-none absolute left-0 top-0 rounded-full transition-opacity duration-150"
        style={{
          width: 0,
          height: 0,
          opacity: 0,
          border: '1.5px solid rgba(255,255,255,0.72)',
          background: 'rgba(122,130,143,0.34)',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.32), 0 2px 10px rgba(0,0,0,0.25)'
        }}
      />
      {!photo && !frozen && !videoEl ? (
        <div className="absolute inset-0 grid place-items-center text-[15px] text-ink-3">
          正在检测摄像头…
        </div>
      ) : null}
    </div>
  )
}
