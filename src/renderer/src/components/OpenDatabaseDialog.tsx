import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
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
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pendingFilePath, setPendingFilePath] = useState<string | null>(null)
  const { setDb, setPendingDb, unlock } = useKdbxStore()

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

      // Demander le mot de passe avant de créer
      setPendingFilePath(filePath)
      setShowPasswordDialog(true)
      setLoading(false)
    } catch (error) {
      toast.error('Erreur lors de la sélection du fichier')
      console.error(error)
      setLoading(false)
    }
  }

  const handleCreateWithPassword = async () => {
    if (!password) {
      toast.error('Veuillez entrer un mot de passe')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }

    if (password.length < 4) {
      toast.error('Le mot de passe doit contenir au moins 4 caractères')
      return
    }

    setLoading(true)
    try {
      if (!pendingFilePath) {
        toast.error('Chemin de fichier manquant')
        setLoading(false)
        return
      }

      const credentials = new Kdbx.Credentials(Kdbx.ProtectedValue.fromString(password))
      const db = Kdbx.Kdbx.create(credentials, 'New Database')
      
      // Configurer pour utiliser AES-KDF au lieu d'Argon2 (non implémenté)
      // Argon2 n'est pas supporté dans kdbxweb, on utilise AES-KDF à la place
      // Les paramètres KDF sont dans db.header.kdfParameters
      if (db.header && db.header.kdfParameters) {
        // Remplacer Argon2 par AES-KDF en modifiant l'UUID du KDF
        const aesKdfUuid = Kdbx.Consts.KdfId.Aes
        // L'UUID est en base64, on doit le décoder en ArrayBuffer
        const binaryString = atob(aesKdfUuid)
        const uuidBytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          uuidBytes[i] = binaryString.charCodeAt(i)
        }
        
        // Supprimer les paramètres Argon2 qui ne sont pas valides pour AES-KDF
        db.header.kdfParameters.remove('S')
        db.header.kdfParameters.remove('P')
        db.header.kdfParameters.remove('I')
        db.header.kdfParameters.remove('M')
        db.header.kdfParameters.remove('V')
        
        // Modifier directement l'UUID dans les items internes
        const uuidItem = db.header.kdfParameters._items.find((item: any) => item.key === '$UUID')
        if (uuidItem) {
          uuidItem.value = uuidBytes.buffer
        }
        
        // Ajouter le paramètre R directement dans les items
        // Le paramètre R doit être de type Int64 (type 5)
        const rounds = new Kdbx.Int64(60000, 0)
        db.header.kdfParameters._items.push({
          key: 'R',
          type: 5, // Type Int64
          value: rounds
        })
        // Mettre à jour la map interne
        if (db.header.kdfParameters._map) {
          db.header.kdfParameters._map.set('R', {
            key: 'R',
            type: 5,
            value: rounds
          })
        }
      }
      
      const data = await db.save()
      await window.api.writeFile(pendingFilePath, new Uint8Array(data))
      
      // Déverrouiller automatiquement la base nouvellement créée
      // On doit recharger depuis le fichier pour déverrouiller
      const fileData = await window.api.readFile(pendingFilePath)
      const uint8Array = new Uint8Array(fileData)
      setPendingDb(uint8Array.buffer, pendingFilePath)
      
      // Déverrouiller avec le mot de passe
      const unlockSuccess = await unlock(password)
      if (!unlockSuccess) {
        toast.error('Erreur lors du déverrouillage de la nouvelle base')
        setLoading(false)
        return
      }

      toast.success('Nouvelle base de données créée et déverrouillée')
      setPassword('')
      setConfirmPassword('')
      setPendingFilePath(null)
      setShowPasswordDialog(false)
      onOpen()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast.error(`Erreur lors de la création: ${errorMessage}`)
      console.error('Erreur complète:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
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

      <Dialog open={showPasswordDialog} onOpenChange={(open) => !open && setShowPasswordDialog(false)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Créer une nouvelle base de données</DialogTitle>
            <DialogDescription>
              Entrez un mot de passe pour protéger votre nouvelle base de données.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-password">Mot de passe</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleCreateWithPassword()
                  }
                }}
                placeholder="Entrez un mot de passe"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleCreateWithPassword()
                  }
                }}
                placeholder="Confirmez le mot de passe"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false)
                setPassword('')
                setConfirmPassword('')
                setPendingFilePath(null)
              }}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button onClick={handleCreateWithPassword} disabled={loading}>
              {loading ? 'Création...' : 'Créer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

