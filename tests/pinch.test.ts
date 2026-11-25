import { describe, expect, it } from 'vitest'

import { MIN_PINCH_SPAN, PinchTracker, midOf, spanOf } from '@renderer/lib/pinch'

describe('spanOf / midOf', () => {
  it('计算两指跨度和中点', () => {
    expect(spanOf({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5)
    expect(midOf({ x: 0, y: 0 }, { x: 10, y: 20 })).toEqual({ x: 5, y: 10 })
  })
})

describe('PinchTracker', () => {
  it('跨度翻倍就放大一倍', () => {
    const tracker = new PinchTracker()
    tracker.reset(200)
    let total = 1
    for (let span = 200; span <= 400; span += 20) {
      total *= tracker.step(span)
    }
    expect(total).toBeCloseTo(2, 2)
  })

  it('基线过短时不缩放', () => {
    const tracker = new PinchTracker()
    tracker.reset(MIN_PINCH_SPAN - 10)
    expect(tracker.step(MIN_PINCH_SPAN - 5)).toBe(1)
    expect(tracker.step(MIN_PINCH_SPAN - 1)).toBe(1)
  })

  it('抖动被死区吃掉', () => {
    const tracker = new PinchTracker()
    tracker.reset(300)
    expect(tracker.step(302)).toBe(1)
    expect(tracker.step(301)).toBe(1)
    expect(tracker.step(300)).toBe(1)
  })

  it('持续缓慢收拢最终会累积生效', () => {
    const tracker = new PinchTracker()
    tracker.reset(300)
    let total = 1
    for (let i = 0; i < 6; i += 1) total *= tracker.step(300 - (i + 1) * 1)
    expect(total).toBeLessThan(1)
  })

  it('单次跳变被限幅但总行程不丢', () => {
    const tracker = new PinchTracker()
    tracker.reset(200)
    const first = tracker.step(1000)
    expect(first).toBeLessThanOrEqual(1.18)
    let total = first
    for (let i = 0; i < 40; i += 1) total *= tracker.step(1000)
    expect(total).toBeGreaterThan(4.5)
  })

  it('换基线（手指增减）后不会跳变', () => {
    const tracker = new PinchTracker()
    tracker.reset(240)
    expect(tracker.step(260)).toBeGreaterThan(1)
    tracker.reset(120)
    expect(tracker.step(130)).toBeLessThanOrEqual(1.18)
  })
})
