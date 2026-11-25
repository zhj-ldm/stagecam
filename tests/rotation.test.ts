import { describe, expect, it } from 'vitest'

import { orientedSize, rotateUV, unrotateUV, toImage, toScreen } from '../src/renderer/src/lib/geometry'

const rect = { x: 100, y: 50, w: 400, h: 300 }

describe('画面旋转', () => {
  it('90/270 交换显示宽高', () => {
    expect(orientedSize(1920, 1080, 0)).toEqual({ w: 1920, h: 1080 })
    expect(orientedSize(1920, 1080, 90)).toEqual({ w: 1080, h: 1920 })
    expect(orientedSize(1920, 1080, 180)).toEqual({ w: 1920, h: 1080 })
    expect(orientedSize(1920, 1080, 270)).toEqual({ w: 1080, h: 1920 })
  })

  it('顺时针 90°：图像左上角落到显示右上角', () => {
    expect(rotateUV(0, 0, 90)).toEqual({ u: 1, v: 0 })
    expect(rotateUV(1, 1, 90)).toEqual({ u: 0, v: 1 })
  })

  it('unrotateUV 是 rotateUV 的逆变换', () => {
    for (const rot of [0, 90, 180, 270] as const) {
      for (const [u, v] of [
        [0.2, 0.7],
        [0.5, 0.5],
        [0.9, 0.1]
      ]) {
        const p = rotateUV(u, v, rot)
        const back = unrotateUV(p.u, p.v, rot)
        expect(back.u).toBeCloseTo(u, 10)
        expect(back.v).toBeCloseTo(v, 10)
      }
    }
  })

  it('屏幕↔图像坐标在旋转后依然互逆（笔迹贴图不漂移）', () => {
    for (const rot of [0, 90, 180, 270] as const) {
      const s = toScreen(rect, 0.3, 0.8, rot)
      const back = toImage(rect, s.x, s.y, rot)
      expect(back.u).toBeCloseTo(0.3, 10)
      expect(back.v).toBeCloseTo(0.8, 10)
      // 旋转后坐标必须落在显示框内
      expect(s.x).toBeGreaterThanOrEqual(rect.x - 1e-9)
      expect(s.x).toBeLessThanOrEqual(rect.x + rect.w + 1e-9)
    }
  })
})
