# Practice Space

I built this project because I compulsively record everything. When I’m playing guitar alone, I’m constantly hitting record on my phone in case I stumble into something worth remembering. When I’m jamming with friends, I let recordings run for hours. The result is always the same: dozens of short clips with no context, or massive recordings full of songs, jams, and half-formed ideas — all technically captured, but practically unusable.

The tools I already had didn’t fit this problem. Voice memo apps are great for capturing sound, but terrible for revisiting it. DAWs are incredibly powerful, but opening one just to cut up a long rehearsal, export a few clips, and organize ideas feels like overkill. The time and friction involved means the recordings usually just sit there, unnamed and untouched, until they’re effectively lost.

This project is my attempt to bridge that gap. It’s a lightweight, local-first tool focused on reviewing, slicing, and organizing recordings without destroying creative momentum. Instead of creating new audio files for every idea, it treats slices as non-destructive references to the original recordings, letting me quickly mark meaningful moments, add context, and reuse them across projects. The goal is simple: make it easy to actually do something meaningful with the recordings, instead of letting them quietly pile up on my phone.

## What is it?

A local-first, offline-capable web application for musicians to organize and practice with audio recordings. Import audio files, visualize waveforms, create non-destructive slices, and organize your practice material—all without a backend.

## ✨ Features

### Audio Management
- 🎵 **Import Audio Files** - Import folders of audio files using the File System Access API
- 📊 **DAW-like Waveform View** - Visualize audio recordings with downsampled waveforms generated in Web Workers
- ✂️ **Non-Destructive Slicing** - Create slices (metadata-only) without modifying original files
- 🎼 **Rich Metadata** - Tag slices with title, composer, performer, type (song, etude, scale, exercise, etc.), and custom tags
- 📝 **Inline Editing** - Edit source and slice metadata directly in the interface

### Organization
- 📁 **Filesystem-style Folders** - Organize slices in hierarchical folders with drag-and-drop support
- 📚 **Library View** - Browse slices grouped by type and title
- 🔍 **Search & Filter** - Filter sources and slices by location, type, artist, or search query
- 🏷️ **Smart Grouping** - Automatically group similar slices (same title/type) across sources

### Projects & Playback
- 📦 **Reusable Projects** - Group slices into practice sessions; slices can belong to multiple projects
- ▶️ **Audio Playback** - Play slices with Web Audio API, keyboard shortcuts (spacebar, arrows)
- 🎯 **Region Selection** - Select and preview audio regions before creating slices
- ⏱️ **Time Navigation** - Seek to specific times, view duration and time ranges

### Export & Sharing
- 💾 **Export Audio** - Export slices as WAV (instant, lossless) or MP3 (compressed with ID3 tags)
- 🏷️ **ID3 Metadata** - MP3 exports include title, artist, album, and custom tags
- 📤 **Batch Export** - Export multiple slices at once from folder view

### Offline & Privacy
- 💾 **Fully Offline** - All data stored in IndexedDB, works completely offline
- 🔒 **Privacy First** - Original audio files never leave your device or get modified
- ⚡ **Fast & Responsive** - Web Workers for waveform processing keep the UI smooth

## 🛠️ Tech Stack

- **Vue 3** with Composition API and `<script setup>` syntax
- **TypeScript** for type safety and better developer experience
- **Vue Router** for client-side routing
- **Bootstrap 5** with custom SCSS for responsive UI and dark mode
- **Font Awesome** for icons
- **Vite** for fast development and optimized builds
- **IndexedDB** (via `idb` library) for local persistence
- **Web Audio API** for audio decoding and playback
- **File System Access API** for persistent file access
- **Web Workers** for background waveform processing
- **lamejs** for MP3 encoding
- **browser-id3-writer** for ID3 tag generation

## 📁 Project Structure

```
src/
├── components/            # Reusable Vue components
│   ├── SourceCard.vue    # Audio source display card
│   ├── WaveformViewer.vue # DAW-like waveform visualization
│   ├── FileBrowser.vue   # File browser with folder navigation
│   ├── FilterBar.vue     # Search and filter controls
│   ├── SliceListItem.vue # Slice card for lists
│   └── ...               # 25+ other components
├── views/                # Page-level components
│   ├── HomeView.vue      # Dashboard with recent items
│   ├── SourcesView.vue   # All audio sources with filtering
│   ├── SourceEditorView.vue # Waveform editor for creating slices
│   ├── LibraryView.vue   # Grouped slices library
│   ├── SliceBrowserView.vue # Folder-based slice organization
│   ├── ProjectView.vue   # Project practice session view
│   └── ...
├──📖 Core Concepts

### Source (formerly AudioFile)
Represents an imported audio file with metadata and a reference to the original file via FileSystemFileHandle. Contains:
- Title, filename, location, duration, size, sample rate, channels
- Waveform data (downsampled peaks for visualization)
- Import date and creation date

### Slice
Non-destructive metadata defining a region within a Source. Original files are never modified. Contains:
- Reference to source (audioFileId)
- Time range (inPoint, outPoint)
- Rich metadata: title, composer, performer, type, tags, notes
- Optional folder association for organization

### Project
A collection of Slice IDs for practice sessions. Features:
- Name, description, and optional color
- Slices can belong to multiple projects for flexible reuse
- Track last updated time

### SliceFolder
Hierarchical folder structure for organizing slices:
- Parent/child relationships for nested folders
- Slices can be associated with folders
- Supports drag-and-drop reorganization
├── types/
│   ├── models.ts         # Core data models (Source, Slice, Project, etc.)
│   └── file-system-access.d.ts # File System Access API types
├── utils/
│   ├── helpers.ts        # Utility functions
│   └── audioExport.ts    # Audio export (WAV/MP3) utilities
├── styles/
│   └── custom-bootstrap.scss # Bootstrap customization
├── App.vue               # Root component with routing
├── main.ts               # Application entry point
└── style.css             # Global styles
```

## Core Concepts
🚀 Getting Started

### Prerequisites

- **Node.js 18+** and npm
- **Modern browser** with File System Access API support:
  - Chrome/Edge 86+
  - Opera 72+
  - (Note: Firefox and Safari do not support File System Access API yet)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/practice-space.git
cd practice-space

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will run at `http://localhost:5173`.

### Building for Production

```bash
# B🏗️ Architecture Decisions

### Why Local-First?
- **Privacy**: Audio files never leave your device
- **Performance**: No network latency, instant access
- **Offline**: Works completely without internet
- **Simple Deployment**: Static hosting, no backend infrastructure

### Why IndexedDB?
- Persistent storage that survives page reloads
- Can store large amounts of data (waveform data, metadata)
- Supports binary data and complex objects
- Works offline

### Why File System Access API?
- Persistent access to files without re-uploading
- Users grant permission once, app maintains references
- Original files never modified or duplicated
- Efficient for large audio libraries

### Why Web Workers for Waveforms?
- Audio downsampling is CPU-intensive
- Processing in background prevents UI blocking
- Keeps the app responsive during waveform generation
- Supports multiple concurrent waveform jobs

### Component Architecture
- **Vue 3 Composition API**: Better code reuse and organization
- **Composables**: Shared logic for filtering, grouping, playback
- **SCSS**: Customizable Bootstrap theming with dark mode
- **TypeScript**: Type safety catches errors early

## 🎹 Usage Tips

- **Keyboard Shortcuts**: 
  - `Space` - Play/pause
  - `←/→` - Seek backward/forward 5s
  - `↑/↓` - Navigate between slices
- **Region Selection**: Click and drag on waveform to select a region
- **Inline Editing**: Double-click titles to edit them directly
- **Drag & Drop**: Drag slices between folders
- **Batch Operations**: Select multiple slices to export or delete
- **Quick Filtering**: Click location, artist, or type tags to filter

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## ⚠️ Browser Compatibility

This app requires the File System Access API, which is currently only available in Chromium-based browsers (Chrome, Edge, Opera). Firefox and Safari support may come in the futur
5. Select regions and create slices with metadata
6. Organize slices in folders or group them into projects
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

- [ ] UI/UX Overhaul
- [x] Basic audio import and waveform visualization
- [x] Manual region selection and slice creation
- [x] Filesystem-style slice browser
- [ ] Project management
- [x] Playback controls with Web Audio API
- [ ] Keyboard shortcuts for DAW-like workflow
- [x] Export/import functionality for projects
- [x] Tagging and search
