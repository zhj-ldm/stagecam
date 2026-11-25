/**
 * Apple 连续曲率圆角（squircle）。
 * 用超椭圆 |x/r|^n + |y/r|^n = 1 逼近 iOS/macOS 的平滑转角，
 * 与普通 border-radius 的四分之一圆弧在视觉上有明显差别：转角更“顺”，过渡更长。
 */

export interface SquircleOptions {
  width: number
  height: number
  radius: number
  /** 曲率指数：越大越方，iOS 观感约 5 */
  exponent?: number
  /** 每个转角的采样段数 */
  samples?: number
}

type Point = [number, number]

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function corner(
  cx: number,
  cy: number,
  sx: number,
  sy: number,
  radius: number,
  exponent: number,
  samples: number,
  fromDeg: number,
  toDeg: number
): Point[] {
  const power = 2 / exponent
  const points: Point[] = []
  for (let i = 0; i <= samples; i += 1) {
    const deg = fromDeg + ((toDeg - fromDeg) * i) / samples
    const rad = (deg * Math.PI) / 180
    const dx = Math.abs(Math.cos(rad)) ** power * radius
    const dy = Math.abs(Math.sin(rad)) ** power * radius
    points.push([round(cx + sx * dx), round(cy + sy * dy)])
  }
  return points
}

export function squirclePath(options: SquircleOptions): string {
  const { width, height, radius } = options
  const exponent = options.exponent ?? 5
  const samples = options.samples ?? 10

  if (width <= 0 || height <= 0) return ''
  const r = Math.max(0, Math.min(radius, width / 2, height / 2))

  const right = width - r
  const bottom = height - r

  const points: Point[] = [
    [r, 0],
    [right, 0],
    ...corner(right, r, 1, -1, r, exponent, samples, 90, 0).slice(1),
    [width, r],
    [width, bottom],
    ...corner(right, bottom, 1, 1, r, exponent, samples, 0, 90).slice(1),
    [right, height],
    [r, height],
    ...corner(r, bottom, -1, 1, r, exponent, samples, 90, 0).slice(1),
    [0, bottom],
    [0, r],
    ...corner(r, r, -1, -1, r, exponent, samples, 0, 90).slice(1)
  ]

  const [first, ...rest] = points
  const tail = rest.map(([x, y]) => `L${x} ${y}`).join(' ')
  return `M${first[0]} ${first[1]} ${tail} Z`
}

/** 生成可直接用于 mask-image 的 data URL */
export function squircleMaskUrl(options: SquircleOptions): string {
  const { width, height } = options
  const d = squirclePath(options)
  if (!d) return ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><path d="${d}" fill="#fff"/></svg>`
  return `url("data:image/svg+xml;base64,${btoa(svg)}")`
}
