import type { Rect } from './geometry'

export type InkTool = 'pen' | 'eraser'

export interface InkPoint {
  u: number
  v: number
}

export interface Stroke {
  id: string
  tool: InkTool
  color: string
  /** 以 1920 宽画面为基准的线宽，渲染时按当前画面宽度等比换算 */
  width: number
  points: InkPoint[]
}

/** 线宽基准宽度：保证 4K 与 1080p 下同一条笔迹的视觉粗细一致 */
export const INK_REFERENCE_WIDTH = 1920

let strokeSeed = 0

export function createStroke(tool: InkTool, color: string, width: number, point: InkPoint): Stroke {
  strokeSeed += 1
  return {
    id: `s${Date.now()}-${strokeSeed}`,
    tool,
    color,
    width,
    points: [point]
  }
}

function strokePxWidth(stroke: Stroke, rect: Rect): number {
  return Math.max(1, stroke.width * (rect.w / INK_REFERENCE_WIDTH))
}

function tracePath(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  rect: Rect
): void {
  const { points } = stroke
  if (points.length === 0) return

  const first = points[0]
  const startX = rect.x + first.u * rect.w
  const startY = rect.y + first.v * rect.h

  if (points.length === 1) {
    const radius = strokePxWidth(stroke, rect) / 2
    ctx.beginPath()
    ctx.arc(startX, startY, radius, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  ctx.beginPath()
  ctx.moveTo(startX, startY)
  for (let i = 1; i < points.length - 1; i += 1) {
    const current = points[i]
    const next = points[i + 1]
    const cx = rect.x + current.u * rect.w
    const cy = rect.y + current.v * rect.h
    const mx = rect.x + ((current.u + next.u) / 2) * rect.w
    const my = rect.y + ((current.v + next.v) / 2) * rect.h
    ctx.quadraticCurveTo(cx, cy, mx, my)
  }
  const last = points[points.length - 1]
  ctx.lineTo(rect.x + last.u * rect.w, rect.y + last.v * rect.h)
  ctx.stroke()
}

export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  rect: Rect
): void {
  ctx.save()
  ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
  ctx.strokeStyle = stroke.color
  ctx.fillStyle = stroke.color
  ctx.lineWidth = strokePxWidth(stroke, rect)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  tracePath(ctx, stroke, rect)
  ctx.restore()
}

/** 全量重绘：视图变换后必须整层重画，笔迹数量在课堂场景下不会成为瓶颈 */
export function drawStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  rect: Rect,
  active: Stroke | null,
  cssWidth: number,
  cssHeight: number,
  dpr: number
): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cssWidth, cssHeight)
  for (const stroke of strokes) drawStroke(ctx, stroke, rect)
  if (active) drawStroke(ctx, active, rect)
}
