import { create } from 'zustand'
import * as Kdbx from 'kdbxweb'

export interface Entry {
  uuid: string
  title: string
  username: string
  password: Kdbx.ProtectedValue | string
  url: string
  notes: string
  tags: string[]
  icon: number
  customFields: Record<string, Kdbx.ProtectedValue | string>
  expires?: Date
  created?: Date
  modified?: Date
}

export interface Group {
  uuid: string
  name: string
  icon: number
  entries: Entry[]
  groups: Group[]
  parent?: Group
}

interface KdbxStore {
  db: Kdbx.Kdbx | null
  dbPath: string | null
  dbFileBuffer: ArrayBuffer | null
  isUnlocked: boolean
  rootGroup: Group | null
  selectedEntry: Entry | null
  selectedGroup: Group | null
  searchQuery: string
  favorites: Set<string>
  
  // Actions
  setDb: (db: Kdbx.Kdbx | null, path: string | null) => void
  setPendingDb: (buffer: ArrayBuffer, path: string) => void
  unlock: (password: string, keyFile?: Uint8Array) => Promise<boolean>
  lock: () => void
  setRootGroup: (group: Group | null) => void
  setSelectedEntry: (entry: Entry | null) => void
  setSelectedGroup: (group: Group | null) => void
  setSearchQuery: (query: string) => void
  toggleFavorite: (entryUuid: string) => void
  save: () => Promise<boolean>
  createEntry: (group: Group, entry: Partial<Entry>) => Promise<Entry | null>
  updateEntry: (entry: Entry) => Promise<boolean>
  deleteEntry: (entry: Entry) => Promise<boolean>
  createGroup: (parent: Group, name: string) => Promise<Group | null>
  deleteGroup: (group: Group) => Promise<boolean>
}

function fieldToString(
  value: Kdbx.ProtectedValue | string | number | boolean | null | undefined
): string {
  if (value == null) return ''
  if (value instanceof Kdbx.ProtectedValue) {
    return value.getText()
  }
  return value.toString()
}

function kdbxGroupToGroup(kdbxGroup: Kdbx.KdbxGroup, parent?: Group): Group {
  const group: Group = {
    uuid: kdbxGroup.uuid.id,
    name: kdbxGroup.name || '',
    icon: kdbxGroup.icon ?? 0,
    entries: [],
    groups: [],
    parent
  }

  // Convert entries
  for (const entry of kdbxGroup.entries) {
    const customFields: Record<string, Kdbx.ProtectedValue | string> = {}
    for (const [key, value] of entry.fields) {
      if (!['Title', 'UserName', 'Password', 'URL', 'Notes'].includes(key)) {
        customFields[key] = value
      }
    }

    const titleField = entry.fields.get('Title') as any
    const usernameField = entry.fields.get('UserName') as any
    const passwordField = entry.fields.get('Password') as any
    const urlField = entry.fields.get('URL') as any
    const notesField = entry.fields.get('Notes') as any

    group.entries.push({
      uuid: entry.uuid.id,
      title: fieldToString(titleField),
      username: fieldToString(usernameField),
      // On conserve la valeur protégée pour le mot de passe
      password: (passwordField as Kdbx.ProtectedValue) || '',
      url: fieldToString(urlField),
      notes: fieldToString(notesField),
      tags: entry.tags || [],
      icon: entry.icon ?? 0,
      customFields,
      expires: entry.times.expiryTime ? new Date(entry.times.expiryTime) : undefined,
      created: entry.times.creationTime ? new Date(entry.times.creationTime) : undefined,
      modified: entry.times.lastModTime ? new Date(entry.times.lastModTime) : undefined
    })
  }

  // Convert sub-groups
  for (const subGroup of kdbxGroup.groups) {
    group.groups.push(kdbxGroupToGroup(subGroup, group))
  }

  return group
}

function findGroupInTree(group: Group | null, uuid?: string | null): Group | null {
  if (!group || !uuid) return null
  if (group.uuid === uuid) return group
  for (const child of group.groups) {
    const found = findGroupInTree(child, uuid)
    if (found) return found
  }
  return null
}

function findEntryInTree(group: Group | null, uuid?: string | null): Entry | null {
  if (!group || !uuid) return null
  for (const entry of group.entries) {
    if (entry.uuid === uuid) return entry
  }
  for (const child of group.groups) {
    const found = findEntryInTree(child, uuid)
    if (found) return found
  }
  return null
}

function syncSelections(
  rootGroup: Group,
  prevSelectedGroup: Group | null,
  prevSelectedEntry: Entry | null
) {
  const nextGroup =
    (prevSelectedGroup && findGroupInTree(rootGroup, prevSelectedGroup.uuid)) || rootGroup
  const nextEntry =
    (prevSelectedEntry && findEntryInTree(rootGroup, prevSelectedEntry.uuid)) || null
  return { nextGroup, nextEntry }
}

export const useKdbxStore = create<KdbxStore>((set, get) => ({
  db: null,
  dbPath: null,
  dbFileBuffer: null,
  isUnlocked: false,
  rootGroup: null,
  selectedEntry: null,
  selectedGroup: null,
  searchQuery: '',
  favorites: new Set(),

  setDb: (db, path) => {
    set({
      db,
      dbPath: path,
      isUnlocked: false,
      rootGroup: null,
      dbFileBuffer: null,
      selectedGroup: null,
      selectedEntry: null
    })
  },

  setPendingDb: (buffer, path) => {
    set({
      db: null,
      dbPath: path,
      dbFileBuffer: buffer,
      isUnlocked: false,
      rootGroup: null,
      selectedGroup: null,
      selectedEntry: null
    })
  },

  unlock: async (password, keyFile) => {
    const { dbFileBuffer, dbPath, selectedGroup, selectedEntry } = get()

    const credentials = new Kdbx.Credentials(
      Kdbx.ProtectedValue.fromString(password),
      keyFile
    )

    let data: ArrayBuffer | null = null

    if (dbFileBuffer) {
      data = dbFileBuffer
    } else if (dbPath) {
      // Relire le fichier depuis le disque pour déverrouiller à nouveau
      const fileData = await window.api.readFile(dbPath)
      data = new Uint8Array(fileData).buffer
    } else {
      return false
    }

    try {
      const newDb = await Kdbx.Kdbx.load(data, credentials)
      const rootGroup = kdbxGroupToGroup(newDb.getDefaultGroup())
      const { nextGroup, nextEntry } = syncSelections(rootGroup, selectedGroup, selectedEntry)
      set({
        db: newDb,
        isUnlocked: true,
        rootGroup,
        dbFileBuffer: null,
        selectedGroup: nextGroup,
        selectedEntry: nextEntry
      })
      return true
    } catch (error) {
      console.error('Failed to load and unlock database:', error)
      return false
    }
  },

  lock: () => {
    set({
      db: null,
      isUnlocked: false,
      rootGroup: null,
      selectedEntry: null,
      selectedGroup: null
    })
  },

  setRootGroup: (rootGroup) => set({ rootGroup }),
  setSelectedEntry: (entry) => set({ selectedEntry: entry }),
  setSelectedGroup: (group) => set({ selectedGroup: group }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  toggleFavorite: (entryUuid) => {
    const { favorites } = get()
    const newFavorites = new Set(favorites)
    if (newFavorites.has(entryUuid)) {
      newFavorites.delete(entryUuid)
    } else {
      newFavorites.add(entryUuid)
    }
    set({ favorites: newFavorites })
  },

  save: async () => {
    const { db, dbPath } = get()
    if (!db || !dbPath) return false

    try {
      const credentials = db.credentials
      if (!credentials) return false

      const data = await db.save()
      await window.api.writeFile(dbPath, new Uint8Array(data))
      return true
    } catch (error) {
      console.error('Failed to save database:', error)
      return false
    }
  },

  createEntry: async (group, entryData) => {
    const { db, isUnlocked } = get()
    if (!db) {
      throw new Error('Base de données non chargée')
    }
    if (!isUnlocked) {
      throw new Error('Base de données verrouillée')
    }

    try {
      const kdbxGroup = group.uuid
        ? db.getGroup(group.uuid) ?? null
        : db.getDefaultGroup()
      if (!kdbxGroup) {
        throw new Error(`Groupe "${group.name}" introuvable dans la base de données`)
      }

      const entry = db.createEntry(kdbxGroup)
      entry.fields.set('Title', Kdbx.ProtectedValue.fromString(entryData.title || 'New Entry'))
      entry.fields.set('UserName', Kdbx.ProtectedValue.fromString(entryData.username || ''))
      entry.fields.set('Password', Kdbx.ProtectedValue.fromString(entryData.password?.toString() || ''))
      entry.fields.set('URL', Kdbx.ProtectedValue.fromString(entryData.url || ''))
      entry.fields.set('Notes', Kdbx.ProtectedValue.fromString(entryData.notes || ''))

      if (entryData.customFields) {
        for (const [key, value] of Object.entries(entryData.customFields)) {
          entry.fields.set(key, typeof value === 'string' ? Kdbx.ProtectedValue.fromString(value) : value)
        }
      }

      // Get the actual values from the entry (they might be ProtectedValue)
      const titleValue = entry.fields.get('Title')
      const usernameValue = entry.fields.get('UserName')
      const passwordValue = entry.fields.get('Password')
      const urlValue = entry.fields.get('URL')
      const notesValue = entry.fields.get('Notes')

      const newEntry: Entry = {
        uuid: entry.uuid.id,
        title: titleValue instanceof Kdbx.ProtectedValue ? titleValue.getText() : (titleValue?.toString() || 'New Entry'),
        username: usernameValue instanceof Kdbx.ProtectedValue ? usernameValue.getText() : (usernameValue?.toString() || ''),
        password: passwordValue || '',
        url: urlValue instanceof Kdbx.ProtectedValue ? urlValue.getText() : (urlValue?.toString() || ''),
        notes: notesValue instanceof Kdbx.ProtectedValue ? notesValue.getText() : (notesValue?.toString() || ''),
        tags: entry.tags || [],
        icon: entry.icon ?? 0,
        customFields: {}
      }

      // Extract custom fields
      for (const [key, value] of entry.fields) {
        if (!['Title', 'UserName', 'Password', 'URL', 'Notes'].includes(key)) {
          newEntry.customFields[key] = value
        }
      }

      // Refresh root group
      const rootGroup = kdbxGroupToGroup(db.getDefaultGroup())
      const { nextGroup } = syncSelections(rootGroup, group, null)
      const entryFromTree = findEntryInTree(rootGroup, entry.uuid.id)
      set({
        rootGroup,
        selectedGroup: nextGroup,
        selectedEntry: entryFromTree ?? null
      })
      return entryFromTree ?? newEntry
    } catch (error) {
      console.error('Failed to create entry:', error)
      throw error // Re-throw so the UI can show the specific error
    }
  },

  updateEntry: async (entry) => {
    const { db, isUnlocked } = get()
    if (!db || !isUnlocked) return false

    try {
      // Find and update the entry
      const findAndUpdateEntry = (g: Kdbx.KdbxGroup, uuid: string): boolean => {
        for (const e of g.entries) {
          if (e.uuid.id === uuid) {
            e.fields.set('Title', Kdbx.ProtectedValue.fromString(entry.title))
            e.fields.set('UserName', Kdbx.ProtectedValue.fromString(entry.username))
            e.fields.set('Password', typeof entry.password === 'string' 
              ? Kdbx.ProtectedValue.fromString(entry.password) 
              : entry.password)
            e.fields.set('URL', Kdbx.ProtectedValue.fromString(entry.url))
            e.fields.set('Notes', Kdbx.ProtectedValue.fromString(entry.notes))
            
            for (const [key, value] of Object.entries(entry.customFields)) {
              e.fields.set(key, typeof value === 'string' ? Kdbx.ProtectedValue.fromString(value) : value)
            }
            return true
          }
        }
        for (const subGroup of g.groups) {
          if (findAndUpdateEntry(subGroup, uuid)) return true
        }
        return false
      }

      const updated = findAndUpdateEntry(db.getDefaultGroup(), entry.uuid)
      if (updated) {
        const rootGroup = kdbxGroupToGroup(db.getDefaultGroup())
        const { nextGroup, nextEntry } = syncSelections(rootGroup, get().selectedGroup, entry)
        set({ rootGroup, selectedGroup: nextGroup, selectedEntry: nextEntry })
      }
      return updated
    } catch (error) {
      console.error('Failed to update entry:', error)
      return false
    }
  },

  deleteEntry: async (entry) => {
    const { db, isUnlocked } = get()
    if (!db || !isUnlocked) return false

    try {
      const findAndDeleteEntry = (g: Kdbx.KdbxGroup, uuid: string): boolean => {
        for (let i = 0; i < g.entries.length; i++) {
          if (g.entries[i].uuid.id === uuid) {
            db.remove(g.entries[i])
            return true
          }
        }
        for (const subGroup of g.groups) {
          if (findAndDeleteEntry(subGroup, uuid)) return true
        }
        return false
      }

      const deleted = findAndDeleteEntry(db.getDefaultGroup(), entry.uuid)
      if (deleted) {
        const rootGroup = kdbxGroupToGroup(db.getDefaultGroup())
        const { nextGroup } = syncSelections(rootGroup, get().selectedGroup, null)
        set({ rootGroup, selectedGroup: nextGroup, selectedEntry: null })
      }
      return deleted
    } catch (error) {
      console.error('Failed to delete entry:', error)
      return false
    }
  },

  createGroup: async (parent, name) => {
    const { db, isUnlocked } = get()
    if (!db || !isUnlocked) return null

    try {
      const findKdbxGroup = (g: Kdbx.KdbxGroup, uuid: string): Kdbx.KdbxGroup | null => {
        if (g.uuid.id === uuid) return g
        for (const subGroup of g.groups) {
          const found = findKdbxGroup(subGroup, uuid)
          if (found) return found
        }
        return null
      }

      const kdbxParent = findKdbxGroup(db.getDefaultGroup(), parent.uuid)
      if (!kdbxParent) return null

      const newGroup = db.createGroup(kdbxParent, name)
      const group: Group = {
        uuid: newGroup.uuid.id,
        name: newGroup.name || name,
        icon: newGroup.icon ?? 0,
        entries: [],
        groups: [],
        parent
      }

      const rootGroup = kdbxGroupToGroup(db.getDefaultGroup())
      const { nextGroup } = syncSelections(rootGroup, group.parent || null, null)
      set({ rootGroup, selectedGroup: nextGroup })
      return group
    } catch (error) {
      console.error('Failed to create group:', error)
      return null
    }
  },

  deleteGroup: async (group) => {
    const { db, isUnlocked } = get()
    if (!db || !isUnlocked) return false

    try {
      const findAndDeleteGroup = (g: Kdbx.KdbxGroup, uuid: string): boolean => {
        for (let i = 0; i < g.groups.length; i++) {
          if (g.groups[i].uuid.id === uuid) {
            db.remove(g.groups[i])
            return true
          }
          if (findAndDeleteGroup(g.groups[i], uuid)) return true
        }
        return false
      }

      const deleted = findAndDeleteGroup(db.getDefaultGroup(), group.uuid)
      if (deleted) {
        const rootGroup = kdbxGroupToGroup(db.getDefaultGroup())
        const { nextGroup } = syncSelections(rootGroup, get().selectedGroup, get().selectedEntry)
        set({ rootGroup, selectedGroup: nextGroup })
      }
      return deleted
    } catch (error) {
      console.error('Failed to delete group:', error)
      return false
    }
  }
}))
