import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { app, BrowserWindow, dialog, net, protocol } from 'electron'

import { resolvePhotoPath } from './gallery-store'
import { registerIpc } from './ipc'
import { installMenu } from './menu'
import { createMainWindow } from './window'

/** 启动日志：Windows 上没有控制台，出问题时只能靠文件排障 */
function writeLog(name: string, content: string): void {
  try {
    const dir = app.getPath('userData')
    mkdirSync(dir, { recursive: true })
    appendFileSync(join(dir, name), `[${new Date().toISOString()}] ${content}\n`)
  } catch {
    // 日志写不进去也不能影响启动
  }
}

function describe(error: unknown): string {
  if (error instanceof Error) return error.stack ?? `${error.name}: ${error.message}`
  return String(error)
}

process.on('uncaughtException', (error) => writeLog('startup-error.log', describe(error)))
process.on('unhandledRejection', (error) => writeLog('startup-error.log', describe(error)))

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

  app
    .whenReady()
    .then(() => {
      // 关闭 Chromium 自身的页面缩放，所有缩放统一由应用视图矩阵接管
      registerAssetProtocol()
      registerIpc()
      installMenu()
      createMainWindow()
      // 给打包后的自动化冒烟测试留一个可验证的启动标记
      writeLog('launch-ok.log', `ready on ${process.platform} / electron ${process.versions.electron}`)
    })
    .catch((error: unknown) => {
      writeLog('startup-error.log', describe(error))
      dialog.showErrorBox('启动失败', describe(error))
      app.quit()
    })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      try {
        createMainWindow()
      } catch (error) {
        writeLog('startup-error.log', describe(error))
      }
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
