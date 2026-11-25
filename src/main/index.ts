import { pathToFileURL } from 'node:url'

import { app, BrowserWindow, net, protocol } from 'electron'

import { resolvePhotoPath } from './gallery-store'
import { registerIpc } from './ipc'
import { installMenu } from './menu'
import { createMainWindow } from './window'

// 相册图片通过自定义协议读取，渲染层永远不接触真实文件路径
app.commandLine.appendSwitch('disable-pinch')

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'asset',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
  }
])

function registerAssetProtocol(): void {
  protocol.handle('asset', async (request) => {
    const url = new URL(request.url)
    if (url.hostname !== 'gallery') return new Response('Not Found', { status: 404 })

    const fileName = decodeURIComponent(url.pathname.replace(/^\/+/, ''))
    if (!fileName) return new Response('Not Found', { status: 404 })

    const filePath = await resolvePhotoPath(fileName)
    return net.fetch(pathToFileURL(filePath).toString())
  })
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.focus()
  })

  app.whenReady().then(() => {
    // 关闭 Chromium 自身的页面缩放，所有缩放统一由应用视图矩阵接管
    registerAssetProtocol()
    registerIpc()
    installMenu()
    createMainWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
