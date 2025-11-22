import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { useKdbxStore } from '@renderer/lib/kdbx-store'
import { toast } from 'sonner'

interface UnlockDialogProps {
  open: boolean
  onUnlocked: () => void
}

export function UnlockDialog({ open, onUnlocked }: UnlockDialogProps) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { unlock } = useKdbxStore()

  const handleUnlock = async () => {
    if (!password) {
      toast.error('Veuillez entrer un mot de passe')
      return
    }

    setLoading(true)
    try {
      const success = await unlock(password)
      if (success) {
        toast.success('Base de données déverrouillée')
        setPassword('')
        onUnlocked()
      } else {
        toast.error('Mot de passe incorrect')
      }
    } catch (error) {
      toast.error('Erreur lors du déverrouillage')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Déverrouiller la base de données</DialogTitle>
          <DialogDescription>
            Entrez votre mot de passe pour accéder à votre base de données KeePass.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  handleUnlock()
                }
              }}
              placeholder="Entrez votre mot de passe"
              autoFocus
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={handleUnlock} disabled={loading}>
            {loading ? 'Déverrouillage...' : 'Déverrouiller'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}


