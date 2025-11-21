import { ElectronAPI } from '@electron-toolkit/preload'

export interface KeepasswordAPI {
  openFileDialog: () => Promise<string | null>
  saveFileDialog: () => Promise<string | null>
  readFile: (filePath: string) => Promise<number[]>
  writeFile: (filePath: string, data: Uint8Array) => Promise<boolean>
  setClipboard: (text: string) => Promise<boolean>
  clearClipboard: () => Promise<boolean>
  checkForUpdates: () => Promise<void>
  downloadUpdate: () => Promise<void>
  installUpdate: () => Promise<void>
  getAppVersion: () => Promise<string>
  onUpdateChecking: (callback: () => void) => () => void
  onUpdateAvailable: (callback: (info: any) => void) => () => void
  onUpdateNotAvailable: (callback: () => void) => () => void
  onUpdateError: (callback: (error: string) => void) => () => void
  onUpdateProgress: (callback: (progress: any) => void) => () => void
  onUpdateDownloaded: (callback: () => void) => () => void
  onClipboardCleared: (callback: () => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: KeepasswordAPI
  }
}


