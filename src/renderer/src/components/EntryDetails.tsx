import { Entry } from '@renderer/lib/kdbx-store'
import { useKdbxStore } from '@renderer/lib/kdbx-store'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'
import { Eye, EyeOff, Copy, Save } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import * as Kdbx from 'kdbxweb'

interface EntryDetailsProps {
  entry: Entry | null
}

export function EntryDetails({ entry }: EntryDetailsProps) {
  const { updateEntry, save } = useKdbxStore()
  const [showPassword, setShowPassword] = useState(false)
  const [editedEntry, setEditedEntry] = useState<Partial<Entry> | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  if (!entry) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <p className="text-muted-foreground">Sélectionnez une entrée pour voir les détails</p>
      </div>
    )
  }

  const currentEntry = editedEntry || entry

  const handleFieldChange = (field: keyof Entry, value: string) => {
    if (!editedEntry) {
      setEditedEntry({ ...entry })
    }
    setEditedEntry((prev) => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!editedEntry || !hasChanges) return

    const success = await updateEntry({ ...entry, ...editedEntry } as Entry)
    if (success) {
      const saveSuccess = await save()
      if (saveSuccess) {
        toast.success('Entrée sauvegardée')
        setHasChanges(false)
        setEditedEntry(null)
      } else {
        toast.error('Erreur lors de la sauvegarde')
      }
    } else {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleCopy = async (text: string, label: string) => {
    await window.api.setClipboard(text)
    toast.success(`${label} copié dans le presse-papiers`)
  }

  const getPasswordDisplay = (): string => {
    const password = currentEntry.password
    if (password instanceof Kdbx.ProtectedValue) {
      return password.getText()
    }
    return password || ''
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{currentEntry.title}</h2>
          {hasChanges && (
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder
            </Button>
          )}
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              value={currentEntry.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Nom d'utilisateur</Label>
            <div className="flex gap-2">
              <Input
                id="username"
                value={currentEntry.username}
                onChange={(e) => handleFieldChange('username', e.target.value)}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(currentEntry.username, 'Nom d\'utilisateur')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <div className="flex gap-2">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={getPasswordDisplay()}
                onChange={(e) => handleFieldChange('password', e.target.value)}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(getPasswordDisplay(), 'Mot de passe')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              value={currentEntry.url}
              onChange={(e) => handleFieldChange('url', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={currentEntry.notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
            />
          </div>

          {Object.keys(currentEntry.customFields || {}).length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>Champs personnalisés</Label>
                {Object.entries(currentEntry.customFields || {}).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{key}</Label>
                    <Input
                      value={typeof value === 'string' ? value : value.getText()}
                      readOnly
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </ScrollArea>
  )
}

