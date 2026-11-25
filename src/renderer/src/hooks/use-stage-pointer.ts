import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type RefObject
} from 'react'

import { toImage, type Rect } from '@renderer/lib/geometry'
import { createStroke } from '@renderer/lib/ink'
import type { InkEngine } from '@renderer/lib/ink-engine'
import { PinchTracker, midOf, spanOf, type Point } from '@renderer/lib/pinch'
import { useAppStore } from '@renderer/store/use-app-store'

type Gesture = 'none' | 'draw' | 'pan' | 'pinch'

const DOUBLE_TAP_MS = 280
const DOUBLE_TAP_SLOP = 12

/**
 * 触控优先的手势状态机：单指书写 / 单指平移 / 双指缩放。
 * - 书写走 pointerrawupdate（采样更密、无合成层排队），线段即时落画布；
 * - 平移与缩放都会把一帧里的合并事件（getCoalescedEvents）逐段消费，
 *   所以触控屏 60Hz、事件被合帧时也是连续的，而不是一格一格跳；
 * - 缩放比交给 PinchTracker：跨度比语义 + 小抖动死区 + 单次限幅 + 残余补偿，
 *   大屏上「收拢多少缩多少」，两指靠得近时不抽搐，手指增减不会跳变。
 */
export function useStagePointer(
  containerRef: RefObject<HTMLDivElement>,
  getRect: () => Rect | null,
  inkRef: RefObject<InkEngine | null>
): {
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void
} {
  const pointers = useRef(new Map<number, Point>())
  const gesture = useRef<Gesture>('none')
  const drawPointerId = useRef<number | null>(null)
  const rawSupported = useRef(false)
  const pinch = useRef(new PinchTracker())
  const pinchAnchor = useRef<Point>({ x: 0, y: 0 })
  const startPoint = useRef<Point>({ x: 0, y: 0 })
  const drifted = useRef(false)
  const lastTap = useRef({ time: 0, x: 0, y: 0 })

  const rebasePinch = useCallback((): void => {
    const pair = [...pointers.current.values()]
    if (pair.length < 2) return
    pinchAnchor.current = midOf(pair[0], pair[1])
    pinch.current.reset(spanOf(pair[0], pair[1]))
  }, [])

  const beginStroke = useCallback(
    (rect: Rect, x: number, y: number): void => {
      const app = useAppStore.getState()
      const engine = inkRef.current
      if (!engine) return
      const width = app.tool === 'eraser' ? app.eraserWidth : app.penWidth
      const { u, v } = toImage(rect, x, y, app.rotation)
      engine.begin(createStroke(app.tool, app.penColor, width, { u, v }))
      drawPointerId.current = null
    },
    [inkRef]
  )

  const endStroke = useCallback((): void => {
    const stroke = inkRef.current?.end() ?? null
    if (stroke && stroke.points.length >= 1) useAppStore.getState().commitStroke(stroke)
    drawPointerId.current = null
  }, [inkRef])

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const rect = getRect()
      if (!rect) return
      containerRef.current?.setPointerCapture(event.pointerId)
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      const app = useAppStore.getState()

      if (pointers.current.size === 2) {
        if (gesture.current === 'draw') endStroke()
        if (app.mode !== 'browse') {
          gesture.current = 'none'
          return
        }
        gesture.current = 'pinch'
        rebasePinch()
        return
      }

      if (pointers.current.size > 2) {
        // 第三指落下：忽略它，但重整基线，避免它在场时缩放跳一下
        if (gesture.current === 'pinch') rebasePinch()
        return
      }

      startPoint.current = { x: event.clientX, y: event.clientY }
      drifted.current = false

      if (app.mode === 'annotate') {
        beginStroke(rect, event.clientX, event.clientY)
        drawPointerId.current = event.pointerId
        gesture.current = 'draw'
        return
      }

      gesture.current = 'pan'
    },
    [beginStroke, containerRef, endStroke, getRect, rebasePinch]
  )

  // 原生 pointerrawupdate：Chromium 会把两次合帧之间的原始采样点都抛出来
  useEffect(() => {
    const el = containerRef.current
    if (!el) return undefined

    const handleRaw = (event: PointerEvent): void => {
      if (gesture.current !== 'draw' || event.pointerId !== drawPointerId.current) return
      const rect = getRect()
      const engine = inkRef.current
      if (!rect || !engine) return
      rawSupported.current = true
      const samples = event.getCoalescedEvents ? event.getCoalescedEvents() : [event]
      for (const sample of samples) {
        const { u, v } = toImage(rect, sample.clientX, sample.clientY, useAppStore.getState().rotation)
        engine.extend({ u, v })
      }
    }

    el.addEventListener('pointerrawupdate', handleRaw as EventListener)
    return () => el.removeEventListener('pointerrawupdate', handleRaw as EventListener)
  }, [containerRef, getRect, inkRef])

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const tracked = pointers.current.get(event.pointerId)
      if (!tracked) return
      const rect = getRect()
      if (!rect) return
      const app = useAppStore.getState()

      if (gesture.current === 'draw') {
        // 已经有 pointerrawupdate 时不再重复落笔，避免笔迹被画两遍
        if (rawSupported.current) return
        const native = event.nativeEvent
        const samples = native.getCoalescedEvents ? native.getCoalescedEvents() : [native]
        for (const sample of samples) {
          const { u, v } = toImage(rect, sample.clientX, sample.clientY, app.rotation)
          inkRef.current?.extend({ u, v })
        }
        tracked.x = event.clientX
        tracked.y = event.clientY
        return
      }

      const native = event.nativeEvent
      const samples: Array<{ clientX: number; clientY: number }> =
        native.getCoalescedEvents && native.getCoalescedEvents().length > 0
          ? native.getCoalescedEvents()
          : [native]

      if (gesture.current === 'pan') {
        for (const sample of samples) {
          const dx = sample.clientX - tracked.x
          const dy = sample.clientY - tracked.y
          tracked.x = sample.clientX
          tracked.y = sample.clientY
          if (dx !== 0 || dy !== 0) app.panBy(dx, dy)
        }
        if (Math.hypot(tracked.x - startPoint.current.x, tracked.y - startPoint.current.y) > 6) {
          drifted.current = true
        }
        return
      }

      if (gesture.current === 'pinch') {
        for (const sample of samples) {
          tracked.x = sample.clientX
          tracked.y = sample.clientY

          const pair = [...pointers.current.values()]
          if (pair.length < 2) {
            gesture.current = 'pan'
            return
          }
          const mid = midOf(pair[0], pair[1])
          const ratio = pinch.current.step(spanOf(pair[0], pair[1]))

          app.panBy(mid.x - pinchAnchor.current.x, mid.y - pinchAnchor.current.y)
          if (ratio !== 1) app.zoomBy(ratio, mid.x, mid.y)
          pinchAnchor.current = mid
        }
        if (Math.hypot(tracked.x - startPoint.current.x, tracked.y - startPoint.current.y) > 6) {
          drifted.current = true
        }
        return
      }
    },
    [getRect, inkRef]
  )

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const app = useAppStore.getState()
      const wasDrawing = gesture.current === 'draw'
      if (wasDrawing) endStroke()

      pointers.current.delete(event.pointerId)
      containerRef.current?.releasePointerCapture?.(event.pointerId)

      if (pointers.current.size === 0) {
        gesture.current = 'none'
        if (!wasDrawing && event.pointerType !== 'pen' && !drifted.current) {
          const now = performance.now()
          const last = lastTap.current
          if (
            now - last.time < DOUBLE_TAP_MS &&
            Math.hypot(event.clientX - last.x, event.clientY - last.y) < DOUBLE_TAP_SLOP
          ) {
            app.resetView()
            lastTap.current = { time: 0, x: 0, y: 0 }
            return
          }
          lastTap.current = { time: now, x: event.clientX, y: event.clientY }
        }
        return
      }

      // 双指放下一根：继续用剩下那根平移，并以当前位置为新起点，不会甩一下
      if (gesture.current === 'pinch' && pointers.current.size === 1) {
        const remaining = [...pointers.current.values()][0]
        pinchAnchor.current = { ...remaining }
        gesture.current = 'pan'
        startPoint.current = { ...remaining }
      }
    },
    [containerRef, endStroke]
  )

  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (gesture.current === 'draw' && event.pointerId === drawPointerId.current) endStroke()
      pointers.current.delete(event.pointerId)
      containerRef.current?.releasePointerCapture?.(event.pointerId)
      pinch.current.reset(0)

      if (pointers.current.size >= 2) {
        // 系统把手势截断了一只：用剩下的两指重整基线，接着捏
        gesture.current = 'pinch'
        rebasePinch()
        return
      }
      if (pointers.current.size === 1) {
        const remaining = [...pointers.current.values()][0]
        startPoint.current = { ...remaining }
        gesture.current = 'pan'
        return
      }
      gesture.current = 'none'
    },
    [containerRef, endStroke, rebasePinch]
  )

  // React 的 wheel 监听是 passive 的，阻止不了触控板捏合触发页面缩放
  useEffect(() => {
    const el = containerRef.current
    if (!el) return undefined

    // 滚轮缩放：把不同设备的 deltaMode 统一折算成像素增量，
    // 再按指数映射成缩放比并限幅，滚一格 ≈ 12%~15%，跟手但不跳。
    const wheelPixels = (event: WheelEvent, viewHeight: number): number => {
      if (event.deltaMode === 1) return event.deltaY * 16
      if (event.deltaMode === 2) return event.deltaY * viewHeight
      return event.deltaY
    }

    const handleWheel = (event: WheelEvent): void => {
      event.preventDefault()
      const app = useAppStore.getState()
      const rect = getRect()
      const pixels = wheelPixels(event, el.clientHeight)

      // 触控板双指捏合（Chromium 会给 ctrlKey 合成事件）：永远走缩放
      if (event.ctrlKey || event.metaKey) {
        const factor = Math.min(1.2, Math.max(0.85, Math.exp(-pixels / 120)))
        app.zoomBy(factor, event.clientX, event.clientY)
        return
      }

      // 鼠标滚轮（一格通常是 100px 级别的离散增量）→ 缩放，锚定在光标处
      if (Math.abs(pixels) >= 40) {
        const factor = Math.min(1.2, Math.max(0.8, Math.exp(-pixels / 160)))
        app.zoomBy(factor, event.clientX, event.clientY)
        return
      }

      // 触控板两指轻扫（连续的小增量）→ 平移，保持原先的滑动手感
      if (rect && app.mode === 'browse') app.panBy(-event.deltaX, -event.deltaY)
    }

    const blockContextMenu = (event: Event): void => event.preventDefault()
    el.addEventListener('wheel', handleWheel, { passive: false })
    el.addEventListener('contextmenu', blockContextMenu)
    return () => {
      el.removeEventListener('wheel', handleWheel)
      el.removeEventListener('contextmenu', blockContextMenu)
    }
  }, [containerRef, getRect])

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel }
}
