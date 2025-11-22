import { app, shell, BrowserWindow, ipcMain, dialog, clipboard } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import icon from '../../resources/icon.png?asset'
import * as fs from 'fs/promises'

let mainWindow: BrowserWindow | null = null
let clipboardTimeout: NodeJS.Timeout | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    icon: process.platform === 'win32' ? icon : process.platform === 'linux' ? icon : undefined,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Auto-updater configuration
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

// Configuration pour GitHub Releases
// electron-updater détecte automatiquement la configuration depuis electron-builder.yml
// Assurez-vous que le package.json contient "homepage": "https://github.com/yourusername/keepassword"

autoUpdater.on('checking-for-update', () => {
  mainWindow?.webContents.send('update-checking')
})

autoUpdater.on('update-available', (info) => {
  mainWindow?.webContents.send('update-available', info)
})

autoUpdater.on('update-not-available', () => {
  mainWindow?.webContents.send('update-not-available')
})

autoUpdater.on('error', (err) => {
  mainWindow?.webContents.send('update-error', err.message)
})

autoUpdater.on('download-progress', (progressObj) => {
  mainWindow?.webContents.send('update-progress', progressObj)
})

autoUpdater.on('update-downloaded', () => {
  mainWindow?.webContents.send('update-downloaded')
})

// IPC Handlers
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [{ name: 'KeePass Database', extensions: ['kdbx'] }]
  })
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

ipcMain.handle('save-file-dialog', async () => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    filters: [{ name: 'KeePass Database', extensions: ['kdbx'] }],
    defaultPath: 'database.kdbx'
  })
  if (!result.canceled && result.filePath) {
    return result.filePath
  }
  return null
})

ipcMain.handle('read-file', async (_, filePath: string) => {
  try {
    const buffer = await fs.readFile(filePath)
    return Array.from(new Uint8Array(buffer))
  } catch (error) {
    throw new Error(`Failed to read file: ${error}`)
  }
})

ipcMain.handle('write-file', async (_, filePath: string, data: Uint8Array) => {
  try {
    await fs.writeFile(filePath, Buffer.from(data))
    return true
  } catch (error) {
    throw new Error(`Failed to write file: ${error}`)
  }
})

ipcMain.handle('set-clipboard', async (_, text: string) => {
  clipboard.writeText(text)
  // Clear clipboard after 30 seconds
  if (clipboardTimeout) {
    clearTimeout(clipboardTimeout)
  }
  clipboardTimeout = setTimeout(() => {
    clipboard.clear()
    mainWindow?.webContents.send('clipboard-cleared')
  }, 30000)
  return true
})

ipcMain.handle('clear-clipboard', () => {
  if (clipboardTimeout) {
    clearTimeout(clipboardTimeout)
    clipboardTimeout = null
  }
  clipboard.clear()
  return true
})

ipcMain.handle('check-for-updates', () => {
  if (!is.dev) {
    autoUpdater.checkForUpdates()
  }
})

ipcMain.handle('download-update', () => {
  autoUpdater.downloadUpdate()
})

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall(false, true)
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.keepassword')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // Check for updates on startup
  if (!is.dev) {
    autoUpdater.checkForUpdatesAndNotify()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

