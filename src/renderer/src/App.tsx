import { useState, useEffect } from 'react'
import { Toaster } from 'sonner'
import { useKdbxStore } from '@renderer/lib/kdbx-store'
import { OpenDatabaseDialog } from './components/OpenDatabaseDialog'
import { UnlockDialog } from './components/UnlockDialog'
import { Sidebar } from './components/Sidebar'
import { EntryList } from './components/EntryList'
import { EntryDetails } from './components/EntryDetails'
import { UpdateDialog } from './components/UpdateDialog'
import { Button } from './components/ui/button'
import { Lock, FolderOpen, Save } from 'lucide-react'
import { toast } from 'sonner'

function App() {
  const { db, isUnlocked, dbPath, dbFileBuffer, lock, save, selectedGroup, setSelectedGroup, rootGroup } =
    useKdbxStore()
  const [showOpenDialog, setShowOpenDialog] = useState(false)
  const [showUnlockDialog, setShowUnlockDialog] = useState(false)

  useEffect(() => {
    if ((db && !isUnlocked) || dbFileBuffer) {
      setShowUnlockDialog(true)
    }
  }, [db, isUnlocked, dbFileBuffer])

  const handleOpenDatabase = () => {
    setShowOpenDialog(true)
  }

  const handleDatabaseOpened = () => {
    setShowOpenDialog(false)
    // Unlock dialog is triggered by useEffect when dbFileBuffer is set
  }

  const handleUnlocked = () => {
    setShowUnlockDialog(false)
  }

  const handleLock = () => {
    lock()
    toast.info('Base de données verrouillée')
  }

  const handleSave = async () => {
    const success = await save()
    if (success) {
      toast.success('Base de données sauvegardée')
    } else {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  if (!db && !dbFileBuffer) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Keepassword</h1>
          <p className="text-muted-foreground">Gestionnaire de mots de passe moderne</p>
          <Button onClick={handleOpenDatabase}>
            <FolderOpen className="h-4 w-4 mr-2" />
            Ouvrir une base de données
          </Button>
        </div>
        <OpenDatabaseDialog
          open={showOpenDialog}
          onOpen={handleDatabaseOpened}
          onClose={() => setShowOpenDialog(false)}
        />
        <Toaster />
      </div>
    )
  }

  if (!isUnlocked) {
    return (
      <>
        <UnlockDialog open={showUnlockDialog} onUnlocked={handleUnlocked} />
        <Toaster />
      </>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="h-12 border-b flex items-center justify-between px-4 bg-card">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Keepassword</h1>
          {dbPath && (
            <span className="text-xs text-muted-foreground truncate max-w-xs">{dbPath}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLock}>
            <Lock className="h-4 w-4 mr-2" />
            Verrouiller
          </Button>
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <Sidebar onSelectGroup={setSelectedGroup} />
        <EntryList
          group={selectedGroup || rootGroup}
          onSelectEntry={(entry) => {
            // Entry selection is handled by the store
            useKdbxStore.getState().setSelectedEntry(entry)
          }}
        />
        <EntryDetails entry={useKdbxStore.getState().selectedEntry} />
      </div>
      <UpdateDialog />
      <Toaster />
    </div>
  )
}

export default App


