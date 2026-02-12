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
  title?: string // User-editable title (defaults to filename without extension)
  fileHandle?: FileSystemFileHandle // Web: File System Access API handle
  androidUri?: string // Android: SAF content URI or file path
  blob?: Blob // In-app generated clip blob
  isClip?: boolean // Indicates this Source is a generated clip
  originSliceId?: string // If clip, references Slice.id
  duration: number // in seconds
  sampleRate: number
  numberOfChannels: number
  waveformData?: Float32Array // Downsampled waveform for visualization
  importedAt: number // timestamp
  createdAt?: number // File creation date timestamp
  size: number // file size in bytes
  location?: string // User-defined location/origin of the file
  notes?: string // User notes about the source file
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
  clipSourceId?: string // References generated clip Source.id
  title: string
  notes?: string
  startTime: number // Start time in seconds (was inPoint)
  endTime: number // End time in seconds (was outPoint)
  createdAt: number // timestamp
  updatedAt: number // timestamp
  clipCreatedAt?: number
  clipUpdatedAt?: number
  tags?: string[]
  type?: string // Type classification (e.g., "Etude", "Scale", "Exercise")
  composers?: string[] // Composer credits
  performers?: string[] // Performer credits (future)
  writers?: string[] // Additional writing credits (future)
}

/**
 * A collection is a grouping of slices
 * Slices can belong to multiple collections
 */
export interface Collection {
  id: string
  name: string
  description?: string
  sliceIds: string[] // References to Slice.id
  groups?: { type: string; title: string }[] // Optional grouped slice references
  owner?: string // Owner from artist pool (composers/performers/writers aggregate)
  collaborators?: string[] // Collaborators from same artist pool
  type?: string // Collection type from a dedicated pool
  createdAt: number
  updatedAt: number
  color?: string // For visual organization
}

/**
 * A project is a scratch pad for song development
 * It can include slices/groups (like collections) and other item types (tabs, lyrics)
 */
export interface ProjectTabItem {
  id: string
  title: string
  content: string // ASCII preview; grid data stored separately
  // Grid tablature properties
  strings?: number
  tuning?: string[] // per string/row label, top-to-bottom
  beatsPerBar?: number
  beatUnit?: number
  bars?: number
  // Allow numeric frets or technique tokens (e.g., 'x', '7h', '10/').
  grid?: Array<Array<number | string | null>> // rows x cols; null when empty
  createdAt: number
  updatedAt: number
}

export interface ProjectLyricItem {
  id: string
  title: string
  content: string // plain text (future: WYSIWYG/markdown)
  createdAt: number
  updatedAt: number
}

export interface Project {
  id: string
  name: string
  description?: string
  sliceIds: string[] // References to Slice.id
  groups?: { type: string; title: string }[] // Optional grouped slice references
  tabs?: ProjectTabItem[]
  lyrics?: ProjectLyricItem[]
  createdAt: number
  updatedAt: number
  color?: string // For visual organization
  // Freeform board layout positions for project items
  // Keys use prefixes: 'slice:<id>', 'tab:<id>', 'lyric:<id>'
  boardLayout?: Record<string, { x: number; y: number; w?: number; h?: number; fs?: number }>
  // Board viewport settings (persisted)
  boardZoom?: number // 50-200 (%), default 100
  boardOffset?: { x: number; y: number }
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
