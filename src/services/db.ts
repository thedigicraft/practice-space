/**
 * IndexedDB database service
 * 
 * Manages all persistence for the application.
 * Uses the 'idb' library for a clean Promise-based API.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb'
import type { AudioFile, Slice, Project, SliceFolder } from '@/types/models'

interface PracticeSpaceDB extends DBSchema {
  audioFiles: {
    key: string
    value: AudioFile
  }
  slices: {
    key: string
    value: Slice
    indexes: { 'by-audioFile': string }
  }
  projects: {
    key: string
    value: Project
  }
  folders: {
    key: string
    value: SliceFolder
    indexes: { 'by-parent': string }
  }
}

const DB_NAME = 'practice-space'
const DB_VERSION = 1

let dbInstance: IDBPDatabase<PracticeSpaceDB> | null = null

/**
 * Initialize and return the database connection
 */
export async function getDB(): Promise<IDBPDatabase<PracticeSpaceDB>> {
  if (dbInstance) {
    return dbInstance
  }

  dbInstance = await openDB<PracticeSpaceDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Audio Files store
      if (!db.objectStoreNames.contains('audioFiles')) {
        db.createObjectStore('audioFiles', { keyPath: 'id' })
      }

      // Slices store with index on audioFileId
      if (!db.objectStoreNames.contains('slices')) {
        const sliceStore = db.createObjectStore('slices', { keyPath: 'id' })
        sliceStore.createIndex('by-audioFile', 'audioFileId')
      }

      // Projects store
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' })
      }

      // Folders store with index on parentId
      if (!db.objectStoreNames.contains('folders')) {
        const folderStore = db.createObjectStore('folders', { keyPath: 'id' })
        folderStore.createIndex('by-parent', 'parentId')
      }
    },
  })

  return dbInstance
}

// AudioFile operations
export async function saveAudioFile(audioFile: AudioFile): Promise<void> {
  const db = await getDB()
  await db.put('audioFiles', audioFile)
}

export async function getAudioFile(id: string): Promise<AudioFile | undefined> {
  const db = await getDB()
  return db.get('audioFiles', id)
}

export async function getAllAudioFiles(): Promise<AudioFile[]> {
  const db = await getDB()
  return db.getAll('audioFiles')
}

export async function deleteAudioFile(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('audioFiles', id)
}

// Slice operations
export async function saveSlice(slice: Slice): Promise<void> {
  const db = await getDB()
  // Ensure tags is a plain array (if it exists) to avoid cloning issues
  const cleanSlice = {
    ...slice,
    tags: slice.tags ? [...slice.tags] : undefined
  }
  await db.put('slices', cleanSlice)
}

export async function getSlice(id: string): Promise<Slice | undefined> {
  const db = await getDB()
  return db.get('slices', id)
}

export async function getAllSlices(): Promise<Slice[]> {
  const db = await getDB()
  return db.getAll('slices')
}

export async function getSlicesByAudioFile(audioFileId: string): Promise<Slice[]> {
  const db = await getDB()
  return db.getAllFromIndex('slices', 'by-audioFile', audioFileId)
}

export async function deleteSlice(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('slices', id)
}

// Project operations
export async function saveProject(project: Project): Promise<void> {
  const db = await getDB()
  await db.put('projects', project)
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await getDB()
  return db.get('projects', id)
}

export async function getAllProjects(): Promise<Project[]> {
  const db = await getDB()
  return db.getAll('projects')
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('projects', id)
}

// Folder operations
export async function saveFolder(folder: SliceFolder): Promise<void> {
  const db = await getDB()
  await db.put('folders', folder)
}

export async function getFolder(id: string): Promise<SliceFolder | undefined> {
  const db = await getDB()
  return db.get('folders', id)
}

export async function getAllFolders(): Promise<SliceFolder[]> {
  const db = await getDB()
  return db.getAll('folders')
}

export async function getFoldersByParent(parentId?: string): Promise<SliceFolder[]> {
  const db = await getDB()
  return db.getAllFromIndex('folders', 'by-parent', parentId || '')
}

export async function deleteFolder(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('folders', id)
}
