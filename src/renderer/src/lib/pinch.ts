export interface Point {
  x: number
  y: number
}

/** 低于这个两指跨度的捏合不缩放：大屏上两指靠太近时，抖动会被比例放大 */
export const MIN_PINCH_SPAN = 64
/** 单次事件允许的最大/最小缩放比：把「合帧一次跳两档」摊平成连续变化 */
const MAX_STEP_RATIO = 1.18
const MIN_STEP_RATIO = 0.85
/** 抖动死区：累计比例未超过这个幅度就不动，超过后一次性补齐 */
const PINCH_DEADZONE = 0.008

export function spanOf(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function midOf(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * 捏合比例积分器。
 *
 * 关键点：
 * 1. 用「跨度比」而不是位移：手指挪多少、画面就缩多少，不会因为屏幕大小而变灵敏
 *    或变迟钝；
 * 2. 小抖动先攒着，攒够死区再一次性应用，避免两指靠得近时画面抽搐；
 * 3. 单次事件限幅，残余比例留到下一次，既不跳变也不丢行程；
 * 4. 基线过小直接不缩放，只跟随中点平移。
 */
export class PinchTracker {
  private span = 0
  private pending = 1

  reset(span: number): void {
    this.span = span
    this.pending = 1
  }

  /** 返回本帧应施加的缩放比；1 表示不动 */
  step(nextSpan: number): number {
    if (!Number.isFinite(nextSpan) || nextSpan <= 0) return 1

    if (this.span <= 0) {
      this.span = nextSpan
      return 1
    }

    // 基线太短：不缩放，但基线继续跟随，等手指拉开后再生效
    if (this.span < MIN_PINCH_SPAN || nextSpan < MIN_PINCH_SPAN) {
      this.span = nextSpan
      this.pending = 1
      return 1
    }

    this.pending *= nextSpan / this.span
    this.span = nextSpan

    if (Math.abs(this.pending - 1) < PINCH_DEADZONE) return 1

    const applied = clamp(this.pending, MIN_STEP_RATIO, MAX_STEP_RATIO)
    this.pending /= applied
    return applied === 1 ? 1 : applied
  }
}
