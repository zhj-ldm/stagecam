import { useEffect, useRef, useState, type CSSProperties, type HTMLAttributes } from 'react'

import { squirclePath } from '@renderer/lib/squircle'

interface SquircleProps extends HTMLAttributes<HTMLDivElement> {
  radius: number
  exponent?: number
}

/**
 * 连续曲率圆角容器：按实测尺寸生成超椭圆路径，用 clip-path 裁切。
 * 相比 border-radius，转角过渡更长、更接近 Apple 的观感；
 * 相比 mask-image，clip-path 在 Chromium 上更稳定，也更容易命中 GPU 合成。
 */
export function Squircle({
  radius,
  exponent = 5,
  className = '',
  style,
  children,
  ...rest
}: SquircleProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const [path, setPath] = useState('')

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined

    const update = (): void => {
      const box = el.getBoundingClientRect()
      if (box.width < 1 || box.height < 1) return
      const next = squirclePath({
        width: Math.round(box.width * 10) / 10,
        height: Math.round(box.height * 10) / 10,
        radius,
        exponent,
        samples: 12
      })
      setPath((current) => (current === next ? current : next))
    }

    const observer = new ResizeObserver(update)
    observer.observe(el)
    update()
    return () => observer.disconnect()
  }, [radius, exponent])

  const clipStyle: CSSProperties = path
    ? { clipPath: `path("${path}")`, WebkitClipPath: `path("${path}")` }
    : {}

  return (
    <div
      ref={ref}
      className={className}
      style={{ ...clipStyle, ...style }}
      {...rest}
    >
      {children}
    </div>
  )
}
