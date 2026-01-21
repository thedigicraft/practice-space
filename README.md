# Practice Space

A local-first, offline-capable web application for musicians. Import audio files, visualize waveforms, create non-destructive slices, and organize your practice material—all without a backend.

## Features

- 🎵 **Import Audio Files** - Use the File System Access API to import folders of audio files
- 📊 **DAW-like Waveform View** - Visualize long audio recordings with downsampled waveforms
- ✂️ **Non-Destructive Slicing** - Create slices (metadata-only) without modifying original files
- 📁 **Filesystem-style Organization** - Organize slices in folders
- 📦 **Reusable Projects** - Group slices into projects; slices can belong to multiple projects
- 💾 **Fully Offline** - All data stored in IndexedDB, works completely offline
- ⚡ **Web Workers** - Waveform generation happens in background threads

## Tech Stack

- **Vue 3** with Composition API and `<script setup>`
- **TypeScript** for type safety
- **Vite** for fast development and optimized builds
- **IndexedDB** (via `idb` library) for local persistence
- **Web Audio API** for audio playback
- **File System Access API** for importing files
- **Web Workers** for waveform processing

## Project Structure

```
src/
├── services/
│   ├── db.ts              # IndexedDB operations
│   ├── audio.ts           # Web Audio API service
│   └── fileSystem.ts      # File System Access API
├── workers/
│   └── waveform.worker.ts # Waveform generation in Web Worker
├── types/
│   └── models.ts          # Core data models (AudioFile, Slice, Project, etc.)
├── utils/
│   └── helpers.ts         # Utility functions
├── App.vue                # Root component
├── main.ts                # Application entry point
└── style.css              # Global styles
```

## Core Concepts

### AudioFile
Represents an imported audio file with metadata and reference to the original file via FileSystemFileHandle.

### Slice
Non-destructive metadata defining a region within an AudioFile (in/out points, title, notes). Original files are never modified.

### Project
A collection of Slice IDs. Slices can belong to multiple projects for flexible reuse.

### SliceFolder
Filesystem-style organization for slices, supporting hierarchical folder structures.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A modern browser with File System Access API support (Chrome 86+, Edge 86+)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development

The app runs at `http://localhost:5173` by default.

All data is stored locally in IndexedDB. Original audio files are accessed via FileSystemFileHandle references and are never modified.

## Architecture Decisions

### Why IndexedDB?
Provides persistent storage that survives page reloads and works offline. Can store large amounts of data including binary audio metadata.

### Why File System Access API?
Allows persistent access to files without re-uploading. Users grant permission once, and the app maintains references to original files.

### Why Web Workers for Waveforms?
Downsampling audio for visualization is CPU-intensive. Processing in a Web Worker prevents UI blocking and keeps the app responsive.

### Why No Backend?
Simplifies deployment, reduces latency, ensures privacy, and enables true offline functionality. All processing happens client-side.

## Browser Compatibility

Requires a modern browser with:
- File System Access API (Chrome 86+, Edge 86+)
- Web Audio API (all modern browsers)
- IndexedDB (all modern browsers)
- Web Workers (all modern browsers)

**Note:** File System Access API is not yet supported in Firefox or Safari. Consider providing fallback file input methods for broader compatibility.

## Development Guidelines

- Keep components focused and composable
- Prefer simple, readable implementations
- Avoid premature optimization
- Use modern browser APIs
- No external dependencies for core audio functionality
- Document architectural decisions

## License

MIT

## Roadmap

- [ ] Basic audio import and waveform visualization
- [ ] Manual region selection and slice creation
- [ ] Filesystem-style slice browser
- [ ] Project management
- [ ] Playback controls with Web Audio API
- [ ] Keyboard shortcuts for DAW-like workflow
- [ ] Export/import functionality for projects
- [ ] Tagging and search
