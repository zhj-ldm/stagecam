import { describe, expect, it } from 'vitest'

import { coverScale, imageRect, toImage, zoomAt, MAX_SCALE } from '@renderer/lib/geometry'

const IMAGE = { w: 1920, h: 1080 }
const VIEW = { w: 1280, h: 720 }

describe('coverScale', () => {
  it('取较大缩放比铺满窗口，允许裁切不留黑边', () => {
    expect(coverScale(1920, 1080, 1280, 720)).toBeCloseTo(1280 / 1920, 5)
    expect(coverScale(1080, 1920, 1280, 720)).toBeCloseTo(1280 / 1080, 5)
  })
})

describe('imageRect', () => {
  it('默认视图下画面居中且至少铺满一个方向', () => {
    const rect = imageRect(IMAGE.w, IMAGE.h, VIEW.w, VIEW.h, { scale: 1, x: 0, y: 0 })
    expect(rect.w).toBeCloseTo(1280, 5)
    expect(rect.h).toBeGreaterThanOrEqual(VIEW.h)
    expect(rect.x).toBeCloseTo(0, 5)
  })
})

describe('zoomAt', () => {
  it('锚点下的图像坐标在缩放前后保持一致', () => {
    const before = imageRect(IMAGE.w, IMAGE.h, VIEW.w, VIEW.h, { scale: 1, x: 0, y: 0 })
    const anchor = { x: 300, y: 200 }
    const { u, v } = toImage(before, anchor.x, anchor.y)

    const next = zoomAt({ scale: 1, x: 0, y: 0 }, 2, anchor.x, anchor.y, IMAGE.w, IMAGE.h, VIEW.w, VIEW.h)
    const after = imageRect(IMAGE.w, IMAGE.h, VIEW.w, VIEW.h, next)
    const mapped = toImage(after, anchor.x, anchor.y)

    expect(mapped.u).toBeCloseTo(u, 4)
    expect(mapped.v).toBeCloseTo(v, 4)
  })

  it('缩放上限远高于原厂软件，且不会越过上限', () => {
    const view = { scale: MAX_SCALE, x: 0, y: 0 }
    expect(zoomAt(view, 2, 10, 10, IMAGE.w, IMAGE.h, VIEW.w, VIEW.h).scale).toBe(MAX_SCALE)
  })
})
