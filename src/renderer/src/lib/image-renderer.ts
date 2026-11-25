import type { Rect } from './geometry'

const VERTEX_SHADER = `
attribute vec2 a_pos;
attribute vec2 a_uv;
varying vec2 v_uv;
void main() {
  v_uv = a_uv;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

const FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
void main() {
  gl_FragColor = texture2D(u_tex, v_uv);
}
`

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('创建着色器失败')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? '着色器编译失败')
  }
  return shader
}

/**
 * 底图渲染器：把视频帧/照片上传为纹理，用一次带变换的四边形绘制铺满窗口。
 * 缩放与平移全部在顶点位置里完成，片元阶段只做纹理采样，因此 4K 下开销很低。
 */
export class ImageRenderer {
  private readonly gl: WebGLRenderingContext
  private readonly program: WebGLProgram
  private readonly buffer: WebGLBuffer
  private readonly texture: WebGLTexture
  private readonly vertices = new Float32Array(16)
  private textureReady = false

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      desynchronized: true,
      preserveDrawingBuffer: true
    })
    if (!gl) throw new Error('当前环境不支持 WebGL')

    this.gl = gl
    const program = gl.createProgram()
    if (!program) throw new Error('创建 WebGL 程序失败')
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER))
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? 'WebGL 程序链接失败')
    }
    gl.useProgram(program)
    this.program = program

    const buffer = gl.createBuffer()
    const texture = gl.createTexture()
    if (!buffer || !texture) throw new Error('创建 WebGL 资源失败')
    this.buffer = buffer
    this.texture = texture

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    const posLoc = gl.getAttribLocation(program, 'a_pos')
    const uvLoc = gl.getAttribLocation(program, 'a_uv')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0)
    gl.enableVertexAttribArray(uvLoc)
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 16, 8)

    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    gl.clearColor(0.02, 0.025, 0.04, 1)
  }

  resize(cssWidth: number, cssHeight: number, dpr: number): void {
    const canvas = this.gl.canvas as HTMLCanvasElement
    const width = Math.max(1, Math.round(cssWidth * dpr))
    const height = Math.max(1, Math.round(cssHeight * dpr))
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    this.gl.viewport(0, 0, width, height)
  }

  upload(source: TexImageSource): void {
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    if (!this.textureReady) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
      this.textureReady = true
      return
    }
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source)
  }

  /** rect 为 CSS 像素坐标；pos 转 clip space，纹理坐标左上为 (0,0) */
  draw(rect: Rect, viewWidth: number, viewHeight: number): void {
    const gl = this.gl
    const left = (rect.x / viewWidth) * 2 - 1
    const right = ((rect.x + rect.w) / viewWidth) * 2 - 1
    const top = 1 - (rect.y / viewHeight) * 2
    const bottom = 1 - ((rect.y + rect.h) / viewHeight) * 2

    const v = this.vertices
    // x, y, u, v
    v[0] = left
    v[1] = top
    v[2] = 0
    v[3] = 0
    v[4] = right
    v[5] = top
    v[6] = 1
    v[7] = 0
    v[8] = left
    v[9] = bottom
    v[10] = 0
    v[11] = 1
    v[12] = right
    v[13] = bottom
    v[14] = 1
    v[15] = 1

    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(this.program)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    gl.bufferData(gl.ARRAY_BUFFER, v, gl.DYNAMIC_DRAW)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  /** 读取当前画面像素（拍照时用，保证拿到的是缩放前的原始分辨率） */
  readPixels(width: number, height: number): Uint8Array {
    const gl = this.gl
    const pixels = new Uint8Array(width * height * 4)
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    return pixels
  }
}
