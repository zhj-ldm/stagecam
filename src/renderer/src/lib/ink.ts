import { toScreen, type Rect, type Rotation } from './geometry'

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
  rect: Rect,
  rotation: Rotation
): void {
  const { points } = stroke
  if (points.length === 0) return

  const first = toScreen(rect, points[0].u, points[0].v, rotation)
  if (points.length === 1) {
    const radius = strokePxWidth(stroke, rect) / 2
    ctx.beginPath()
    ctx.arc(first.x, first.y, radius, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  ctx.beginPath()
  ctx.moveTo(first.x, first.y)
  for (let i = 1; i < points.length - 1; i += 1) {
    const current = points[i]
    const next = points[i + 1]
    const p = toScreen(rect, current.u, current.v, rotation)
    const m = toScreen(rect, (current.u + next.u) / 2, (current.v + next.v) / 2, rotation)
    ctx.quadraticCurveTo(p.x, p.y, m.x, m.y)
  }
  const last = toScreen(rect, points[points.length - 1].u, points[points.length - 1].v, rotation)
  ctx.lineTo(last.x, last.y)
  ctx.stroke()
}

export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  rect: Rect,
  rotation: Rotation = 0
): void {
  ctx.save()
  ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
  ctx.strokeStyle = stroke.color
  ctx.fillStyle = stroke.color
  ctx.lineWidth = strokePxWidth(stroke, rect)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  tracePath(ctx, stroke, rect, rotation)
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
