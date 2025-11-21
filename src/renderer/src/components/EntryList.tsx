import { Entry, Group } from '@renderer/lib/kdbx-store'
import { useKdbxStore } from '@renderer/lib/kdbx-store'
import { ScrollArea } from './ui/scroll-area'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Search, Star, Trash2, Plus } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface EntryListProps {
  group: Group | null
  onSelectEntry: (entry: Entry) => void
}

export function EntryList({ group, onSelectEntry }: EntryListProps) {
  const { searchQuery, setSearchQuery, selectedEntry, favorites, toggleFavorite, deleteEntry, createEntry } = useKdbxStore()

  const getEntries = (): Entry[] => {
    if (!group) return []
    
    const allEntries: Entry[] = []
    const collectEntries = (g: Group) => {
      allEntries.push(...g.entries)
      g.groups.forEach(collectEntries)
    }
    collectEntries(group)
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return allEntries.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          e.username.toLowerCase().includes(query) ||
          e.url.toLowerCase().includes(query)
      )
    }
    
    return allEntries
  }

  const entries = getEntries()
  const sortedEntries = [...entries].sort((a, b) => {
    const aFav = favorites.has(a.uuid)
    const bFav = favorites.has(b.uuid)
    if (aFav !== bFav) return aFav ? -1 : 1
    return a.title.localeCompare(b.title)
  })

  const handleDelete = async (entry: Entry) => {
    if (confirm(`Supprimer l'entrée "${entry.title}" ?`)) {
      const success = await deleteEntry(entry)
      if (success) {
        toast.success('Entrée supprimée')
      } else {
        toast.error('Erreur lors de la suppression')
      }
    }
  }

  const handleCreateEntry = async () => {
    if (!group) return
    
    try {
      const newEntry = await createEntry(group, {
        title: 'Nouvelle entrée',
        username: '',
        password: '',
        url: '',
        notes: ''
      })
      
      if (newEntry) {
        toast.success('Entrée créée')
        onSelectEntry(newEntry)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la création'
      toast.error(errorMessage)
      console.error('Error creating entry:', error)
    }
  }

  return (
    <div className="w-80 border-r bg-background flex flex-col">
      <div className="p-3 border-b space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={handleCreateEntry} disabled={!group}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle entrée
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sortedEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">
              {searchQuery ? 'Aucun résultat' : 'Aucune entrée'}
            </p>
          ) : (
            sortedEntries.map((entry) => (
              <div
                key={entry.uuid}
                className={cn(
                  'p-3 rounded-md cursor-pointer hover:bg-accent border border-transparent hover:border-border',
                  selectedEntry?.uuid === entry.uuid && 'bg-accent border-border'
                )}
                onClick={() => onSelectEntry(entry)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm truncate">{entry.title}</h3>
                      {favorites.has(entry.uuid) && (
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">{entry.username}</p>
                    {entry.url && (
                      <p className="text-xs text-muted-foreground truncate">{entry.url}</p>
                    )}
                    {entry.expires && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Expire: {format(entry.expires, 'dd/MM/yyyy')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(entry.uuid)
                      }}
                    >
                      <Star
                        className={cn(
                          'h-3 w-3',
                          favorites.has(entry.uuid) && 'fill-yellow-500 text-yellow-500'
                        )}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(entry)
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

