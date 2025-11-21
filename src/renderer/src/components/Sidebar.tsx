import { Group } from '@renderer/lib/kdbx-store'
import { useKdbxStore } from '@renderer/lib/kdbx-store'
import { ScrollArea } from './ui/scroll-area'
import { Button } from './ui/button'
import { Folder, FolderOpen, Plus, Trash2 } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { toast } from 'sonner'

interface SidebarProps {
  onSelectGroup: (group: Group) => void
}

function GroupItem({ group, level = 0, onSelect, selectedGroup }: { 
  group: Group
  level?: number
  onSelect: (group: Group) => void
  selectedGroup: Group | null
}) {
  const { deleteGroup } = useKdbxStore()
  const isSelected = selectedGroup?.uuid === group.uuid

  const handleDelete = async () => {
    if (confirm(`Supprimer le groupe "${group.name}" ?`)) {
      const success = await deleteGroup(group)
      if (success) {
        toast.success('Groupe supprimé')
      } else {
        toast.error('Erreur lors de la suppression')
      }
    }
  }

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent',
          isSelected && 'bg-accent',
          level > 0 && 'ml-4'
        )}
        style={{ paddingLeft: `${8 + level * 16}px` }}
        onClick={() => onSelect(group)}
      >
        {isSelected ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
        <span className="flex-1 text-sm">{group.name}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation()
            handleDelete()
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      {group.groups.map((subGroup) => (
        <GroupItem
          key={subGroup.uuid}
          group={subGroup}
          level={level + 1}
          onSelect={onSelect}
          selectedGroup={selectedGroup}
        />
      ))}
    </div>
  )
}

export function Sidebar({ onSelectGroup }: SidebarProps) {
  const { rootGroup, selectedGroup, createGroup } = useKdbxStore()

  const handleCreateGroup = async () => {
    const name = prompt('Nom du nouveau groupe:')
    if (!name) return

    const parent = selectedGroup || rootGroup
    if (!parent) return

    const newGroup = await createGroup(parent, name)
    if (newGroup) {
      toast.success('Groupe créé')
    } else {
      toast.error('Erreur lors de la création')
    }
  }

  if (!rootGroup) {
    return (
      <div className="w-64 border-r bg-muted/40 p-4">
        <p className="text-sm text-muted-foreground">Aucune base de données ouverte</p>
      </div>
    )
  }

  return (
    <div className="w-64 border-r bg-muted/40 flex flex-col">
      <div className="p-2 border-b flex items-center justify-between">
        <h2 className="text-sm font-semibold">Groupes</h2>
        <Button variant="ghost" size="icon" onClick={handleCreateGroup}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          <GroupItem
            group={rootGroup}
            onSelect={onSelectGroup}
            selectedGroup={selectedGroup}
          />
        </div>
      </ScrollArea>
    </div>
  )
}


