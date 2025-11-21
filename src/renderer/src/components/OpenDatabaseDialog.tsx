import { useState } from 'react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { useKdbxStore } from '@renderer/lib/kdbx-store'
import { toast } from 'sonner'
import * as Kdbx from 'kdbxweb'

interface OpenDatabaseDialogProps {
  open: boolean
  onOpen: () => void
  onClose: () => void
}

export function OpenDatabaseDialog({ open, onOpen, onClose }: OpenDatabaseDialogProps) {
  const [loading, setLoading] = useState(false)
  const { setDb, setPendingDb } = useKdbxStore()

  const handleOpenFile = async () => {
    setLoading(true)
    try {
      const filePath = await window.api.openFileDialog()
      if (!filePath) {
        setLoading(false)
        return
      }

      const fileData = await window.api.readFile(filePath)
      const uint8Array = new Uint8Array(fileData)
      
      // Store buffer and path, defer unlocking to UnlockDialog
      setPendingDb(uint8Array.buffer, filePath)
      onOpen() // This will close the open dialog
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast.error(`Erreur: ${errorMessage}`)
      console.error('Full error object:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = async () => {
    setLoading(true)
    try {
      const filePath = await window.api.saveFileDialog()
      if (!filePath) {
        setLoading(false)
        return
      }

      const credentials = new Kdbx.Credentials(Kdbx.ProtectedValue.fromString(''))
      const db = Kdbx.Kdbx.create(credentials, 'New Database')
      
      const data = await db.save()
      await window.api.writeFile(filePath, new Uint8Array(data))
      
      setDb(db, filePath)
      toast.success('Nouvelle base de données créée')
      onOpen()
    } catch (error) {
      toast.error('Erreur lors de la création de la base de données')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ouvrir une base de données</DialogTitle>
          <DialogDescription>
            Ouvrez une base de données existante ou créez-en une nouvelle.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-4">
          <Button onClick={handleOpenFile} disabled={loading} className="w-full">
            {loading ? 'Chargement...' : 'Ouvrir un fichier .kdbx'}
          </Button>
          <Button onClick={handleCreateNew} disabled={loading} variant="outline" className="w-full">
            {loading ? 'Création...' : 'Créer une nouvelle base'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

