# Practice Space - Architecture Overview (2026)

## Project Structure

```
practicespace/
├── .github/
│   └── copilot-instructions.md
├── src/
│   ├── components/                # Reusable UI components (SCSS)
│   │   ├── SourceCard.vue
│   │   ├── LibraryTypeSection.vue
│   │   ├── LibraryItemCard.vue
│   │   ├── SourceTableRow.vue
│   │   ├── FilterBar.vue
│   │   ├── SourceMetadataBar.vue
│   │   ├── SliceListItem.vue
│   │   ├── SliceTableRow.vue
│   │   ├── ExportMenu.vue
│   │   ├── FolderNavigationBreadcrumbs.vue
│   │   ├── SliceSelectionToolbar.vue
│   │   ├── WaveformViewer.vue
│   │   ├── FileBrowser.vue
│   │   └── ToastNotification.vue
│   ├── views/                     # Route-level pages
│   │   ├── HomeView.vue
│   │   ├── SourcesView.vue
│   │   ├── SourceEditorView.vue
│   │   ├── SliceBrowserView.vue
│   │   ├── LibraryView.vue
│   │   ├── ProjectView.vue
│   │   ├── ProjectsView.vue
│   │   └── GroupedSlicesView.vue
│   ├── composables/               # Shared logic (Composition API)
│   │   ├── useSourceFiltering.ts
│   │   ├── useSliceGrouping.ts
│   │   ├── useAudioPlayback.ts
│   │   ├── useWaveformWorker.ts
│   │   ├── useKeyboardShortcuts.ts
│   │   ├── useDragAndDrop.ts
│   │   └── useTypeFormatting.ts
│   ├── services/                  # Core business logic
│   │   ├── db.ts                  # IndexedDB (idb wrapper)
│   │   ├── audio.ts               # Web Audio API service
│   │   └── fileSystem.ts          # File System Access API
│   ├── workers/
│   │   └── waveform.worker.ts     # Waveform generation worker
│   ├── types/
│   │   ├── models.ts              # Core data models
│   │   └── file-system-access.d.ts
│   ├── utils/
│   │   ├── helpers.ts             # Common utilities
│   │   └── audioExport.ts         # WAV/MP3 export helpers
│   ├── styles/
│   │   └── custom-bootstrap.scss  # Bootstrap theming (SCSS)
│   ├── App.vue                    # Root component
│   ├── main.ts                    # Entry; imports custom Bootstrap SCSS
│   └── vite-env.d.ts              # Vite env types
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── .gitignore
└── README.md
```

## Data Flow

### 1. Import Audio Files
```
User clicks "Import Files" (ImportControls)
  ↓
File System Access API (services/fileSystem.ts)
  ↓
Create Source metadata (types/models.ts)
  ↓
Persist Source + FileSystemFileHandle in IndexedDB (services/db.ts)
  ↓
Decode audio headers (services/audio.ts)
  ↓
Send to Web Worker (workers/waveform.worker.ts)
  ↓
Generate downsampled waveform peaks
  ↓
Store waveform data in IndexedDB
```

### 2. Create Slices
```
User selects region in WaveformViewer
  ↓
Create Slice metadata (in/out, title, composer, performer, type, tags, notes)
  ↓
Persist Slice in IndexedDB (services/db.ts)
  ↓
Original audio file remains unchanged
```

### 3. Organize in Folders and Library
```
Slice browser (FileBrowser) lists folders and slices
  ↓
Breadcrumb navigation (FolderNavigationBreadcrumbs)
  ↓
Selection toolbar for batch actions (SliceSelectionToolbar)
  ↓
Library view groups slices by type/title (LibraryTypeSection)
```

### 4. Projects
```
Create/open Project
  ↓
Associate Slice IDs (many-to-many)
  ↓
Store Project in IndexedDB
```

### 5. Playback
```
User plays a slice (SliceListItem / SourceEditorView)
  ↓
Load Source via FileSystemFileHandle
  ↓
Decode with Web Audio API (services/audio.ts)
  ↓
Play from Slice.inPoint to Slice.outPoint
```

### 6. Export
```
User opens ExportMenu (WAV/MP3)
  ↓
Render audio buffer for slice region
  ↓
WAV: write PCM → save via File System Access API
MP3: encode via @breezystack/lamejs → tag via browser-id3-writer → save
```

## Core Concepts

### Source (formerly AudioFile)
- **Stored:** IndexedDB
- **Contains:** Title, filename, location, duration, size, sample rate, channels, waveform
- **File Handle:** Persistent `FileSystemFileHandle`
- **Original file:** Never modified

### Slice
- **Stored:** IndexedDB
- **Contains:** audioFileId, in/out, title, composer, performer, type, tags, notes, optional folderId
- **Non-destructive:** References original Source

### Project
- **Stored:** IndexedDB
- **Contains:** name, description, sliceIds[], updatedAt
- **Relation:** Slices can be reused across multiple projects

### SliceFolder
- **Stored:** IndexedDB
- **Contains:** hierarchical folders for organizing slices
- **Features:** breadcrumb navigation, drag-and-drop reorganization

## Routing
- HomeView: dashboard with recent sources and grouped slices
- SourcesView: searchable/filterable list of all sources
- SourceEditorView: waveform editor and slice creation
- SliceBrowserView: folder-based slice organization
- LibraryView: grouped slices by type/title
- ProjectView / ProjectsView: practice sessions and management
- GroupedSlicesView: drill-down into a library group

## Component Architecture
- **SCSS-first components** scoped with `lang="scss"`
- **Key components:** SourceCard, LibraryTypeSection, LibraryItemCard, SourceTableRow, FilterBar,
  SourceMetadataBar, SliceListItem, SliceTableRow, ExportMenu, FolderNavigationBreadcrumbs,
  SliceSelectionToolbar, WaveformViewer, FileBrowser, ToastNotification

## Composables (Composition API)
- `useSourceFiltering`: filter + sort sources (search, location, sortBy)
- `useSliceGrouping`: group slices by type/title with locations and counts
- `useAudioPlayback`: unified playback control
- `useWaveformWorker`: background waveform generation
- `useKeyboardShortcuts`: global shortcuts (space/arrow keys)
- `useDragAndDrop`: folder reorganization
- `useTypeFormatting`: map slice types to icons/labels

## Styling & Theming
- **Bootstrap 5** customized via `styles/custom-bootstrap.scss` (imported in `src/main.ts`)
- **Dark Mode** via `data-bs-theme="dark"`
- **Font Awesome** icons

## Persistence & Models
- **IndexedDB** via `idb` abstraction in `services/db.ts`
- **Models:** `types/models.ts` defines `Source`, `Slice`, `Project`, `SliceFolder`, etc.
- **Workers:** waveform peaks stored for fast render

## Export Pipeline
- **WAV**: PCM encoding for lossless output
- **MP3**: `@breezystack/lamejs` encoder + `browser-id3-writer` for ID3 tags
- **File Save**: File System Access API prompts user to save

## Notes
- App is local-first and fully offline — no backend
- Original audio files never modified or uploaded

### Project
- **Stored:** IndexedDB
- **Contains:** Array of Slice IDs
- **Reusable:** Slices can belong to multiple projects

### SliceFolder
- **Stored:** IndexedDB
- **Contains:** Hierarchy info (parentId) + Slice IDs
- **Organization:** Filesystem-style structure

## Technology Decisions

### IndexedDB (via `idb`)
- **Why:** Persistent, works offline, large storage capacity
- **Stores:** Metadata only (no binary audio data)
- **Schema:** Object stores for audioFiles, slices, projects, folders

### File System Access API
- **Why:** Persistent file access without re-uploading
- **Usage:** Store FileSystemFileHandle, request permission once
- **Limitation:** Chrome/Edge only (Firefox/Safari unsupported)

### Web Audio API
- **Why:** Standard browser API for audio playback
- **Usage:** Decode audio, play regions, manage playback state
- **Benefits:** No external dependencies

### Web Workers
- **Why:** CPU-intensive waveform generation blocks UI
- **Usage:** Process audio in background thread
- **Benefits:** Keeps interface responsive

## Next Steps

### Immediate
1. Create waveform visualization component
2. Build audio file import UI
3. Implement region selection on waveform
4. Create slice creation dialog

### Medium Term
1. Build filesystem-style slice browser
2. Implement project management UI
3. Add playback controls
4. Keyboard shortcuts for DAW workflow

### Future
1. Export/import project data
2. Tagging and search functionality
3. Multiple waveform views (zoom levels)
4. Offline service worker
