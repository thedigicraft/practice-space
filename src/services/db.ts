/**
 * IndexedDB database service
 * 
 * Manages all persistence for the application.
 * Uses the 'idb' library for a clean Promise-based API.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb'
import type { AudioFile, Slice, Collection, SliceFolder, Project } from '@/types/models'
import { getSourceArrayBuffer } from '@/services/platformAudio'
import { loadAudioBuffer } from '@/services/audio'
import { extractSlice, audioBufferToWavBlob, normalizeAudioBuffer } from '@/utils/audioExport'
import { generateWaveformData } from '@/utils/helpers'

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
    value: Collection
  }
  songProjects: {
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
const DB_VERSION = 2

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

      // Song Projects store (new projects feature)
      if (!db.objectStoreNames.contains('songProjects')) {
        db.createObjectStore('songProjects', { keyPath: 'id' })
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
  // Create a clean copy without Vue reactive proxies
  const cleanSlice: Slice = {
    id: slice.id,
    audioFileId: slice.audioFileId,
    clipSourceId: slice.clipSourceId,
    title: slice.title,
    notes: slice.notes,
    startTime: slice.startTime,
    endTime: slice.endTime,
    createdAt: slice.createdAt,
    updatedAt: slice.updatedAt,
    clipCreatedAt: slice.clipCreatedAt,
    clipUpdatedAt: slice.clipUpdatedAt,
    tags: slice.tags ? [...slice.tags] : undefined,
    type: slice.type,
    composers: slice.composers ? [...slice.composers] : undefined,
    performers: slice.performers ? [...slice.performers] : undefined,
    writers: slice.writers ? [...slice.writers] : undefined
  }
  // Check existing slice to see if region changed or clip missing
  const existing = await db.get('slices', slice.id)
  const needsClipUpdate = !existing || !existing.clipSourceId || existing.startTime !== slice.startTime || existing.endTime !== slice.endTime
  if (needsClipUpdate) {
    try {
      const src = await db.get('audioFiles', slice.audioFileId)
      if (src) {
        const arrayBuffer = await getSourceArrayBuffer(src)
        const fullBuffer = await loadAudioBuffer(arrayBuffer)
        const clipBuffer = extractSlice(fullBuffer, slice.startTime, slice.endTime)
        const clipBlob = audioBufferToWavBlob(clipBuffer)
        const waveformData = await generateWaveformData(clipBuffer, 800)
        const clipSource: AudioFile = {
          id: crypto.randomUUID(),
          name: `${(src.title || src.name || 'source')}-slice-${slice.id}.wav`,
          title: slice.title || `Slice ${slice.id}`,
          blob: clipBlob,
          isClip: true,
          originSliceId: slice.id,
          duration: clipBuffer.duration,
          sampleRate: clipBuffer.sampleRate,
          numberOfChannels: clipBuffer.numberOfChannels,
          waveformData,
          importedAt: Date.now(),
          createdAt: Date.now(),
          size: clipBlob.size,
          location: 'clip',
          notes: `Generated from ${src.id}`,
        }
        await db.put('audioFiles', clipSource)
        cleanSlice.clipSourceId = clipSource.id
        cleanSlice.clipCreatedAt = Date.now()
        cleanSlice.clipUpdatedAt = Date.now()
      }
    } catch (err) {
      console.warn('Failed to generate clip for slice', slice.id, err)
    }
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

// One-time utility: generate clips for all existing slices
export async function prewarmAllSliceClips(onProgress?: (done: number, total: number) => void): Promise<{ processed: number; updated: number }> {
  const db = await getDB()
  const all = await db.getAll('slices')
  let processed = 0
  let updated = 0
  for (const s of all) {
    const before = s.clipSourceId
    await saveSlice(s)
    const after = await db.get('slices', s.id)
    if (!before && after?.clipSourceId) updated++
    processed++
    if (onProgress) onProgress(processed, all.length)
  }
  return { processed, updated }
}

// Collection operations
export async function saveCollection(collection: Collection): Promise<void> {
  const db = await getDB()
  // Create a clean copy to avoid Vue reactive proxies or non-cloneable refs
  const cleanCollection: Collection = {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    sliceIds: collection.sliceIds ? [...collection.sliceIds] : [],
    groups: collection.groups
      ? collection.groups.map(g => ({ type: g.type, title: g.title }))
      : undefined,
    owner: collection.owner,
    collaborators: collection.collaborators ? [...collection.collaborators] : undefined,
    type: collection.type,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
    color: collection.color,
  }
  await db.put('projects', cleanCollection)
}

export async function getCollection(id: string): Promise<Collection | undefined> {
  const db = await getDB()
  return db.get('projects', id)
}

export async function getAllCollections(): Promise<Collection[]> {
  const db = await getDB()
  return db.getAll('projects')
}

export async function deleteCollection(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('projects', id)
}

// Song Project operations (distinct store from legacy 'projects' used by collections)
export async function saveProject(project: Project): Promise<void> {
  const db = await getDB()
  const cleanProject: Project = {
    id: project.id,
    name: project.name,
    description: project.description,
    sliceIds: project.sliceIds ? [...project.sliceIds] : [],
    groups: project.groups
      ? project.groups.map(g => ({ type: g.type, title: g.title }))
      : undefined,
    tabs: project.tabs
      ? project.tabs.map(t => ({
          id: t.id,
          title: t.title,
          content: t.content,
          strings: t.strings,
          tuning: t.tuning ? [...t.tuning] : undefined,
          beatsPerBar: t.beatsPerBar,
          beatUnit: t.beatUnit,
          bars: t.bars,
          grid: t.grid ? t.grid.map(row => row.map(v => v)) : undefined,
          repeatSections: t.repeatSections
            ? t.repeatSections.map(s => ({ id: s.id, title: s.title, startBar: s.startBar, barCount: s.barCount, repeats: s.repeats }))
            : undefined,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })
      )
      : undefined,
    lyrics: project.lyrics
      ? project.lyrics.map(l => ({ id: l.id, title: l.title, content: l.content, createdAt: l.createdAt, updatedAt: l.updatedAt }))
      : undefined,
    sections: project.sections
      ? project.sections.map(s => ({ id: s.id, title: s.title, color: s.color, createdAt: s.createdAt, updatedAt: s.updatedAt }))
      : undefined,
    boardLayout: project.boardLayout
      ? Object.fromEntries(Object.entries(project.boardLayout).map(([k, pos]) => [k, { x: pos.x, y: pos.y, w: pos.w, h: pos.h, fs: pos.fs, parent: pos.parent }]))
      : undefined,
    boardZoom: project.boardZoom,
    boardOffset: project.boardOffset ? { x: project.boardOffset.x, y: project.boardOffset.y } : undefined,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    color: project.color,
  }
  await db.put('songProjects', cleanProject)
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await getDB()
  return db.get('songProjects', id)
}

export async function getAllProjects(): Promise<Project[]> {
  const db = await getDB()
  return db.getAll('songProjects')
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('songProjects', id)
}

// Create a normalized copy of a Source as a new Source entry (non-destructive)
export async function createNormalizedSource(original: AudioFile, targetPeak: number = 0.98): Promise<AudioFile> {
  const db = await getDB()
  const arrayBuffer = await getSourceArrayBuffer(original)
  const buffer = await loadAudioBuffer(arrayBuffer)
  const normalized = normalizeAudioBuffer(buffer, targetPeak)
  const blob = audioBufferToWavBlob(normalized)
  const waveformData = await generateWaveformData(normalized, 800)

  const now = Date.now()
  const baseName = (original.title || original.name || 'source')
  const name = `${baseName}-normalized.wav`
  const newSource: AudioFile = {
    id: crypto.randomUUID(),
    name,
    title: `${baseName} (Normalized)`,
    blob,
    isClip: false,
    duration: normalized.duration,
    sampleRate: normalized.sampleRate,
    numberOfChannels: normalized.numberOfChannels,
    waveformData,
    importedAt: now,
    createdAt: now,
    size: blob.size,
    location: 'Edited',
    notes: `Normalized copy of ${original.id}`,
  }

  await db.put('audioFiles', newSource)
  return newSource
}

// Normalize a slice region and update the slice to point to the new normalized clip
export async function normalizeSlice(slice: Slice, targetPeak: number = 0.98): Promise<Slice> {
  const db = await getDB()
  const src = await db.get('audioFiles', slice.audioFileId)
  if (!src) throw new Error('Source not found for slice')
  const arrayBuffer = await getSourceArrayBuffer(src)
  const fullBuffer = await loadAudioBuffer(arrayBuffer)
  const clipBuffer = extractSlice(fullBuffer, slice.startTime, slice.endTime)
  const normalized = normalizeAudioBuffer(clipBuffer, targetPeak)
  const clipBlob = audioBufferToWavBlob(normalized)
  const waveformData = await generateWaveformData(normalized, 800)

  const clipSource: AudioFile = {
    id: crypto.randomUUID(),
    name: `${(src.title || src.name || 'source')}-slice-${slice.id}-normalized.wav`,
    title: `${slice.title || `Slice ${slice.id}`} (Normalized)`,
    blob: clipBlob,
    isClip: true,
    originSliceId: slice.id,
    duration: normalized.duration,
    sampleRate: normalized.sampleRate,
    numberOfChannels: normalized.numberOfChannels,
    waveformData,
    importedAt: Date.now(),
    createdAt: Date.now(),
    size: clipBlob.size,
    location: 'clip',
    notes: `Normalized from ${src.id}`,
  }
  await db.put('audioFiles', clipSource)

  const updated: Slice = {
    ...slice,
    clipSourceId: clipSource.id,
    clipCreatedAt: Date.now(),
    clipUpdatedAt: Date.now(),
    updatedAt: Date.now(),
  }
  await db.put('slices', updated)
  return updated
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
