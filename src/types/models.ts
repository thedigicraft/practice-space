/**
 * Core data models for Practice Space
 * 
 * All data is stored in IndexedDB.
 * Original audio files are never modified.
 */

/**
 * Represents an imported audio file (source)
 */
export interface Source {
  id: string
  name: string
  fileHandle: FileSystemFileHandle // For File System Access API
  duration: number // in seconds
  sampleRate: number
  numberOfChannels: number
  waveformData?: Float32Array // Downsampled waveform for visualization
  importedAt: number // timestamp
  size: number // file size in bytes
}

// Legacy alias for backwards compatibility during transition
export type AudioFile = Source;

/**
 * A non-destructive slice of an audio file
 * Stores only metadata - references the original file
 */
export interface Slice {
  id: string
  audioFileId: string // References Source (keeping field name for DB compatibility)
  title: string
  notes?: string
  startTime: number // Start time in seconds (was inPoint)
  endTime: number // End time in seconds (was outPoint)
  createdAt: number // timestamp
  updatedAt: number // timestamp
  tags?: string[]
}

/**
 * A project is a collection of slices
 * Slices can belong to multiple projects
 */
export interface Project {
  id: string
  name: string
  description?: string
  sliceIds: string[] // References to Slice.id
  createdAt: number
  updatedAt: number
  color?: string // For visual organization
}

/**
 * Folder for organizing slices (filesystem-style)
 */
export interface SliceFolder {
  id: string
  name: string
  parentId?: string // null for root folders
  sliceIds: string[]
  createdAt: number
  updatedAt: number
}

/**
 * Playback state (not persisted, runtime only)
 */
export interface PlaybackState {
  isPlaying: boolean
  currentTime: number
  duration: number
  audioFileId?: string
  sliceId?: string
}
