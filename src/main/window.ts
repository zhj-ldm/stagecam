import { join } from 'node:path'

import { BrowserWindow, shell } from 'electron'

const DEV_BG = '#07080a'

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: DEV_BG,
    // 与底栏胶囊保持同一视觉语言：窗口本身也是一个完整圆角容器
    roundedCorners: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // 展台需要长时间稳定出帧，禁用后台节流
      backgroundThrottling: false
    }
  })

  // 全屏黑板上不需要系统标题栏按钮，关闭/最小化由应用自绘控件承担
  win.setWindowButtonVisibility(false)
  // 禁用 Chromium 自身的页面缩放：触控屏双指只允许驱动应用内的视图变换
  win.webContents.setVisualZoomLevelLimits(1, 1)

  win.once('ready-to-show', () => {
    win.show()
    win.focus()
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  if (rendererUrl) {
    win.loadURL(rendererUrl)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}
