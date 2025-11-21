import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { toast } from 'sonner'

export function UpdateDialog() {
  const [updateState, setUpdateState] = useState<{
    checking: boolean
    available: boolean
    downloading: boolean
    downloaded: boolean
    progress?: number
    version?: string
    error?: string
  }>({
    checking: false,
    available: false,
    downloading: false,
    downloaded: false
  })

  useEffect(() => {
    const removeChecking = window.api.onUpdateChecking(() => {
      setUpdateState((prev) => ({ ...prev, checking: true }))
    })

    const removeAvailable = window.api.onUpdateAvailable((info) => {
      setUpdateState((prev) => ({
        ...prev,
        checking: false,
        available: true,
        version: info.version
      }))
    })

    const removeNotAvailable = window.api.onUpdateNotAvailable(() => {
      setUpdateState((prev) => ({ ...prev, checking: false, available: false }))
    })

    const removeError = window.api.onUpdateError((error) => {
      setUpdateState((prev) => ({
        ...prev,
        checking: false,
        downloading: false,
        error
      }))
      toast.error(`Erreur de mise à jour: ${error}`)
    })

    const removeProgress = window.api.onUpdateProgress((progress) => {
      setUpdateState((prev) => ({
        ...prev,
        downloading: true,
        progress: progress.percent
      }))
    })

    const removeDownloaded = window.api.onUpdateDownloaded(() => {
      setUpdateState((prev) => ({
        ...prev,
        downloading: false,
        downloaded: true
      }))
      toast.success('Mise à jour téléchargée. Redémarrage...')
    })

    return () => {
      removeChecking()
      removeAvailable()
      removeNotAvailable()
      removeError()
      removeProgress()
      removeDownloaded()
    }
  }, [])

  const handleDownload = () => {
    window.api.downloadUpdate()
  }

  const handleInstall = () => {
    window.api.installUpdate()
  }

  if (!updateState.available && !updateState.downloading && !updateState.downloaded) {
    return null
  }

  return (
    <Dialog open={updateState.available || updateState.downloading || updateState.downloaded}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mise à jour disponible</DialogTitle>
          <DialogDescription>
            {updateState.downloaded
              ? 'La mise à jour est prête à être installée.'
              : updateState.downloading
              ? 'Téléchargement en cours...'
              : `Une nouvelle version (${updateState.version}) est disponible.`}
          </DialogDescription>
        </DialogHeader>
        {updateState.downloading && updateState.progress !== undefined && (
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${updateState.progress}%` }}
            />
          </div>
        )}
        <div className="flex justify-end gap-2">
          {updateState.available && !updateState.downloading && (
            <Button onClick={handleDownload}>Télécharger</Button>
          )}
          {updateState.downloaded && (
            <Button onClick={handleInstall}>Installer et redémarrer</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}


