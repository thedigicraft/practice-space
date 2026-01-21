# Practice Space - Architecture Overview

## Project Structure

```
practicespace/
├── .github/
│   └── copilot-instructions.md    # AI coding assistant context
├── src/
│   ├── services/                  # Core business logic
│   │   ├── db.ts                  # IndexedDB operations (idb wrapper)
│   │   ├── audio.ts               # Web Audio API service
│   │   └── fileSystem.ts          # File System Access API
│   ├── workers/                   # Background processing
│   │   └── waveform.worker.ts     # Waveform generation
│   ├── types/                     # TypeScript definitions
│   │   ├── models.ts              # Core data models
│   │   └── file-system-access.d.ts # File System Access API types
│   ├── utils/                     # Helper functions
│   │   └── helpers.ts             # Common utilities
│   ├── App.vue                    # Root component
│   ├── main.ts                    # Application entry
│   ├── style.css                  # Global styles
│   └── vite-env.d.ts              # Vite environment types
├── index.html                     # Entry HTML
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
├── tsconfig.node.json             # Node TypeScript config
├── vite.config.ts                 # Vite configuration
├── .gitignore                     # Git ignore rules
└── README.md                      # Project documentation
```

## Data Flow

### 1. Import Audio Files
```
User clicks "Import" 
  ↓
File System Access API (fileSystem.ts)
  ↓
Create AudioFile metadata
  ↓
Store FileSystemFileHandle in IndexedDB (db.ts)
  ↓
Decode audio with Web Audio API (audio.ts)
  ↓
Send to Web Worker (waveform.worker.ts)
  ↓
Generate downsampled waveform
  ↓
Store waveform data in IndexedDB
```

### 2. Create Slices
```
User selects region on waveform
  ↓
Create Slice metadata (in/out points, title, notes)
  ↓
Store in IndexedDB (db.ts)
  ↓
Original audio file unchanged
```

### 3. Organize in Projects
```
User creates/opens Project
  ↓
Add Slice IDs to Project.sliceIds array
  ↓
Store Project in IndexedDB
  ↓
Slices can belong to multiple projects
```

### 4. Playback
```
User clicks play on Slice
  ↓
Load AudioFile via FileSystemFileHandle
  ↓
Get File object (fileSystem.ts)
  ↓
Decode with Web Audio API (audio.ts)
  ↓
Play from Slice.inPoint to Slice.outPoint
```

## Core Concepts

### AudioFile
- **Stored:** IndexedDB
- **Contains:** Metadata + FileSystemFileHandle reference
- **Original file:** Never modified, accessed via handle

### Slice
- **Stored:** IndexedDB
- **Contains:** Metadata only (fileId, in, out, title, notes)
- **Non-destructive:** References original AudioFile

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
