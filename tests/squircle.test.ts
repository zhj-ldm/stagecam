import { describe, expect, it } from 'vitest'

import { squirclePath, squircleMaskUrl } from '@renderer/lib/squircle'

describe('squirclePath', () => {
  it('生成闭合路径且不含非法数值', () => {
    const path = squirclePath({ width: 120, height: 48, radius: 14 })
    expect(path.startsWith('M')).toBe(true)
    expect(path.trimEnd().endsWith('Z')).toBe(true)
    expect(path).not.toContain('NaN')
    expect(path).not.toContain('Infinity')
  })

  it('半径超过短边一半时按短边收敛', () => {
    const narrow = squirclePath({ width: 40, height: 20, radius: 30 })
    expect(narrow).not.toContain('NaN')
  })

  it('尺寸非法时返回空路径，调用方降级为普通矩形', () => {
    expect(squirclePath({ width: 0, height: 20, radius: 8 })).toBe('')
  })
})

describe('squircleMaskUrl', () => {
  it('输出可直接用于 CSS 的 data URL', () => {
    const url = squircleMaskUrl({ width: 64, height: 64, radius: 16 })
    expect(url.startsWith('url("data:image/svg+xml;base64,')).toBe(true)
    expect(url.endsWith('")')).toBe(true)
  })
})
