import { toScreen, type Rect, type Rotation } from './geometry'
import { drawStroke, type InkPoint, type Stroke } from './ink'

const INK_WIDTH_REFERENCE = 1920

function paintSegment(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  rect: Rect,
  from: InkPoint,
  to: InkPoint,
  rotation: Rotation
): void {
  const start = toScreen(rect, from.u, from.v, rotation)
  const end = toScreen(rect, to.u, to.v, rotation)
  const pxWidth = Math.max(1, stroke.width * (rect.w / INK_WIDTH_REFERENCE))

  ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
  ctx.strokeStyle = stroke.color
  ctx.lineWidth = pxWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.lineTo(end.x, end.y)
  ctx.stroke()
}

function paintSmoothSegment(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  rect: Rect,
  from: InkPoint,
  control: InkPoint,
  to: InkPoint,
  rotation: Rotation
): void {
  const start = toScreen(rect, from.u, from.v, rotation)
  const ctrl = toScreen(rect, control.u, control.v, rotation)
  const end = toScreen(rect, to.u, to.v, rotation)
  const pxWidth = Math.max(1, stroke.width * (rect.w / INK_WIDTH_REFERENCE))

  ctx.strokeStyle = stroke.color
  ctx.lineWidth = pxWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.quadraticCurveTo(ctrl.x, ctrl.y, end.x, end.y)
  ctx.stroke()
}

function sameRect(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h
}

/**
 * 低延迟笔迹引擎。
 *
 * 核心规则：笔迹永远按“当前屏幕设备像素”栅格化，绝不烘进低分辨率的图像位图，
 * 因此松笔、缩放、平移之后都保持和落笔时一样的清晰度。
 * - 活动笔迹画在独立 live 层，pointerrawupdate 同步落笔；
 * - 已提交笔迹每帧按当前视图矩形全量矢量重绘（实测 60 条 × 200 点 ≈ 0.3ms），
 *   于是笔迹与底图在同一帧、同一坐标系里移动，天然严丝合缝、零漂移；
 * - 视图静止时不重绘，等于白拿。
 */
export class InkEngine {
  private visibleCtx: CanvasRenderingContext2D | null = null
  private liveCtx: CanvasRenderingContext2D | null = null
  private strokes: Stroke[] = []
  private rect: Rect = { x: 0, y: 0, w: 1, h: 1 }
  private rotation: Rotation = 0
  private dirty = true
  private cssWidth = 1
  private cssHeight = 1
  private dpr = 1
  private active: Stroke | null = null
  private lastPoint: InkPoint | null = null
  private lastMid: InkPoint | null = null

  setSurface(visible: HTMLCanvasElement, live: HTMLCanvasElement): void {
    this.visibleCtx = visible.getContext('2d', { desynchronized: true })
    this.liveCtx = live.getContext('2d', { desynchronized: true })
  }

  resize(cssWidth: number, cssHeight: number, dpr: number): void {
    const changed = this.cssWidth !== cssWidth || this.cssHeight !== cssHeight || this.dpr !== dpr
    this.cssWidth = cssWidth
    this.cssHeight = cssHeight
    this.dpr = dpr
    if (!changed) return

    const width = Math.round(cssWidth * dpr)
    const height = Math.round(cssHeight * dpr)
    for (const canvas of [this.visibleCtx?.canvas, this.liveCtx?.canvas]) {
      if (canvas && (canvas.width !== width || canvas.height !== height)) {
        canvas.width = width
        canvas.height = height
      }
    }
    this.dirty = true
  }

  setRect(rect: Rect): void {
    if (sameRect(this.rect, rect)) return
    this.rect = rect
    this.dirty = true
  }

  /** 画面旋转时笔迹必须按新方向重新映射，整层重绘 */
  setRotation(rotation: Rotation): void {
    if (this.rotation === rotation) return
    this.rotation = rotation
    this.dirty = true
  }

  /** 换图/撤销/清空时重设笔迹集合并重绘 */
  redraw(strokes: Stroke[]): void {
    this.strokes = strokes
    this.dirty = true
    this.paint()
  }

  /** 每帧合成：视图一动就按矢量重绘，静止则零成本 */
  compose(): void {
    if (this.dirty) this.paint()
  }

  begin(stroke: Stroke): void {
    this.active = stroke
    this.lastPoint = stroke.points[0] ?? null
    this.lastMid = null
    if (stroke.tool === 'pen') this.clearLive()
  }

  /** 立即落笔，不经任何异步调度 */
  extend(point: InkPoint): void {
    const stroke = this.active
    if (!stroke) return
    stroke.points.push(point)
    if (!this.lastPoint) {
      this.lastPoint = point
      return
    }

    // 落笔即用中点平滑，live 层与收笔后的曲线形状一致，松手不会“跳一下”

    if (stroke.tool === 'eraser') {
      // 橡皮直接擦在已提交层：松手前就能看到被擦掉的效果
      const ctx = this.visibleCtx
      if (ctx) {
        if (this.dirty) this.paint()
        ctx.save()
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
        paintSegment(ctx, stroke, this.rect, this.lastPoint, point, this.rotation)
        ctx.restore()
      }
    } else {
      const ctx = this.liveCtx
      const mid: InkPoint = {
        u: (this.lastPoint.u + point.u) / 2,
        v: (this.lastPoint.v + point.v) / 2
      }
      if (ctx) {
        ctx.save()
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
        const from = this.lastMid ?? this.lastPoint
        paintSmoothSegment(ctx, stroke, this.rect, from, this.lastPoint, mid, this.rotation)
        ctx.restore()
      }
      this.lastMid = mid
    }

    this.lastPoint = point
  }

  /** 收笔：并入笔迹集合并按屏幕分辨率重绘，画质与落笔时完全一致 */
  end(): Stroke | null {
    const stroke = this.active
    this.active = null
    this.lastPoint = null
    this.lastMid = null
    if (!stroke) return null

    if (stroke.tool === 'eraser') {
      this.dirty = false
      return stroke
    }

    this.clearLive()
    this.strokes = [...this.strokes, stroke]
    this.dirty = true
    this.paint()
    return stroke
  }

  private paint(): void {
    const ctx = this.visibleCtx
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    for (const stroke of this.strokes) drawStroke(ctx, stroke, this.rect, this.rotation)
    this.dirty = false
  }

  private clearLive(): void {
    const ctx = this.liveCtx
    if (!ctx) return
    ctx.save()
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.clearRect(0, 0, this.cssWidth, this.cssHeight)
    ctx.restore()
  }
}
