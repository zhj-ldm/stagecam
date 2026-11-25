import { app, Menu, type MenuItemConstructorOptions } from 'electron'

/**
 * 应用菜单保持极简：只保留系统级必需项与快捷键。
 * Windows 下不挂载菜单栏，避免破坏"一个完整框"的视觉。
 */
export function installMenu(): void {
  const isMac = process.platform === 'darwin'

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),
    {
      label: '编辑',
      submenu: [
        { role: 'undo', accelerator: 'CmdOrCtrl+Z' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'togglefullscreen', accelerator: isMac ? 'Ctrl+Cmd+F' : 'F11' },
        { role: 'reload', visible: Boolean(process.env['ELECTRON_RENDERER_URL']) },
        { role: 'toggleDevTools', visible: Boolean(process.env['ELECTRON_RENDERER_URL']) }
      ]
    },
    { role: 'windowMenu' }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
