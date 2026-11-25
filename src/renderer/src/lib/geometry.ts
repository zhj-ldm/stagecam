/**
 * 视图变换的唯一数学来源。
 * 约定：图像坐标使用归一化 (u, v) ∈ [0,1]，屏幕坐标使用 CSS 像素。
 * 所有笔迹以图像坐标保存，因此换分辨率、换设备、缩放都不会错位。
 */

export interface ViewState {
  scale: number
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** 缩放范围：不设“原厂软件那种上限”，放大到 80× 仍可继续拖动观察细节 */
export const MIN_SCALE = 0.15
export const MAX_SCALE = 80

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** cover 铺满：以窗口为准取较大缩放比，允许裁切但不留黑边 */
export function coverScale(imageW: number, imageH: number, viewW: number, viewH: number): number {
  if (imageW <= 0 || imageH <= 0) return 1
  return Math.max(viewW / imageW, viewH / imageH)
}

export function imageRect(
  imageW: number,
  imageH: number,
  viewW: number,
  viewH: number,
  view: ViewState
): Rect {
  const base = coverScale(imageW, imageH, viewW, viewH)
  const w = imageW * base * view.scale
  const h = imageH * base * view.scale
  return {
    x: (viewW - w) / 2 + view.x,
    y: (viewH - h) / 2 + view.y,
    w,
    h
  }
}

export function toImage(rect: Rect, screenX: number, screenY: number): { u: number; v: number } {
  if (rect.w === 0 || rect.h === 0) return { u: 0, v: 0 }
  return {
    u: (screenX - rect.x) / rect.w,
    v: (screenY - rect.y) / rect.h
  }
}

export function toScreen(rect: Rect, u: number, v: number): { x: number; y: number } {
  return { x: rect.x + u * rect.w, y: rect.y + v * rect.h }
}

/** 以锚点为中心缩放：锚点下的图像内容保持不动 */
export function zoomAt(
  view: ViewState,
  factor: number,
  anchorX: number,
  anchorY: number,
  imageW: number,
  imageH: number,
  viewW: number,
  viewH: number
): ViewState {
  const nextScale = clamp(view.scale * factor, MIN_SCALE, MAX_SCALE)
  if (nextScale === view.scale) return view

  const base = coverScale(imageW, imageH, viewW, viewH)
  const before = imageRect(imageW, imageH, viewW, viewH, view)
  const { u, v } = toImage(before, anchorX, anchorY)

  const w = imageW * base * nextScale
  const h = imageH * base * nextScale
  const x = anchorX - u * w - (viewW - w) / 2
  const y = anchorY - v * h - (viewH - h) / 2
  return clampView({ scale: nextScale, x, y }, imageW, imageH, viewW, viewH)
}

/** 平移限位：保证画面始终有至少 3 成内容留在窗口内，不会被拖丢 */
export function clampView(
  view: ViewState,
  imageW: number,
  imageH: number,
  viewW: number,
  viewH: number
): ViewState {
  const base = coverScale(imageW, imageH, viewW, viewH)
  const w = imageW * base * view.scale
  const h = imageH * base * view.scale
  const margin = 0.3

  // rect.x = (viewW - w) / 2 + view.x，代入“画面可见 ≥ margin”解出 view.x 区间
  const minX = margin * viewW - (w + viewW) / 2
  const maxX = (w + viewW) / 2 - margin * viewW
  const minY = margin * viewH - (h + viewH) / 2
  const maxY = (h + viewH) / 2 - margin * viewH

  return {
    scale: view.scale,
    x: clamp(view.x, minX, maxX),
    y: clamp(view.y, minY, maxY)
  }
}

/** 双击/重置：回到 cover 铺满状态 */
export function fitView(): ViewState {
  return { scale: 1, x: 0, y: 0 }
}
