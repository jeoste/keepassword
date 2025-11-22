import { Entry } from '@renderer/lib/kdbx-store'
import { useKdbxStore } from '@renderer/lib/kdbx-store'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { Eye, EyeOff, Copy, Save, Dice1 } from 'lucide-react'
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
  const [showPasswordGenerator, setShowPasswordGenerator] = useState(false)
  const [passwordLength, setPasswordLength] = useState(16)
  const [includeUppercase, setIncludeUppercase] = useState(true)
  const [includeLowercase, setIncludeLowercase] = useState(true)
  const [includeNumbers, setIncludeNumbers] = useState(true)
  const [includeSymbols, setIncludeSymbols] = useState(true)

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

  const generatePassword = (): string => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'
    
    let charset = ''
    if (includeUppercase) charset += uppercase
    if (includeLowercase) charset += lowercase
    if (includeNumbers) charset += numbers
    if (includeSymbols) charset += symbols
    
    // S'assurer qu'au moins un type de caractère est sélectionné
    if (charset.length === 0) {
      charset = lowercase + numbers
    }
    
    // Générer le mot de passe
    let password = ''
    const array = new Uint8Array(passwordLength)
    crypto.getRandomValues(array)
    
    for (let i = 0; i < passwordLength; i++) {
      password += charset[array[i] % charset.length]
    }
    
    // S'assurer que le mot de passe contient au moins un caractère de chaque type sélectionné
    if (includeUppercase && !/[A-Z]/.test(password)) {
      const randomIndex = Math.floor(Math.random() * passwordLength)
      password = password.substring(0, randomIndex) + uppercase[Math.floor(Math.random() * uppercase.length)] + password.substring(randomIndex + 1)
    }
    if (includeLowercase && !/[a-z]/.test(password)) {
      const randomIndex = Math.floor(Math.random() * passwordLength)
      password = password.substring(0, randomIndex) + lowercase[Math.floor(Math.random() * lowercase.length)] + password.substring(randomIndex + 1)
    }
    if (includeNumbers && !/[0-9]/.test(password)) {
      const randomIndex = Math.floor(Math.random() * passwordLength)
      password = password.substring(0, randomIndex) + numbers[Math.floor(Math.random() * numbers.length)] + password.substring(randomIndex + 1)
    }
    if (includeSymbols && !/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
      const randomIndex = Math.floor(Math.random() * passwordLength)
      password = password.substring(0, randomIndex) + symbols[Math.floor(Math.random() * symbols.length)] + password.substring(randomIndex + 1)
    }
    
    return password
  }

  const handleGeneratePassword = () => {
    const newPassword = generatePassword()
    handleFieldChange('password', newPassword)
    setShowPasswordGenerator(false)
    toast.success('Mot de passe généré')
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
                onClick={() => setShowPasswordGenerator(true)}
                title="Générer un mot de passe"
              >
                <Dice1 className="h-4 w-4" />
              </Button>
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

      <Dialog open={showPasswordGenerator} onOpenChange={setShowPasswordGenerator}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Générer un mot de passe</DialogTitle>
            <DialogDescription>
              Configurez les options pour générer un mot de passe sécurisé.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="password-length">Longueur : {passwordLength}</Label>
              <input
                id="password-length"
                type="range"
                min="8"
                max="128"
                value={passwordLength}
                onChange={(e) => setPasswordLength(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>8</span>
                <span>128</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="include-uppercase"
                  checked={includeUppercase}
                  onChange={(e) => setIncludeUppercase(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="include-uppercase" className="cursor-pointer">
                  Majuscules (A-Z)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="include-lowercase"
                  checked={includeLowercase}
                  onChange={(e) => setIncludeLowercase(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="include-lowercase" className="cursor-pointer">
                  Minuscules (a-z)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="include-numbers"
                  checked={includeNumbers}
                  onChange={(e) => setIncludeNumbers(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="include-numbers" className="cursor-pointer">
                  Chiffres (0-9)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="include-symbols"
                  checked={includeSymbols}
                  onChange={(e) => setIncludeSymbols(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="include-symbols" className="cursor-pointer">
                  Symboles (!@#$%...)
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordGenerator(false)}>
              Annuler
            </Button>
            <Button onClick={handleGeneratePassword} disabled={!includeUppercase && !includeLowercase && !includeNumbers && !includeSymbols}>
              Générer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  )
}

