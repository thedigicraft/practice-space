# Getting Started

## Requirements
- Node.js 18+ and npm (for local development)
- Chromium-based browser (Chrome, Edge, Opera) for File System Access API

## Install & Run
```bash
npm install
npm run dev
```
App runs at http://localhost:5173.

## First Use
1. Click "Import Files" to select audio files or folders
2. Grant file system permissions when prompted
3. Wait for waveform generation (runs in background)
4. Open a source to view the waveform
5. Select a region and create a slice with metadata
6. Organize slices in folders or group into projects

## Data & Privacy
- All data is stored in IndexedDB
- Original files are never modified; only referenced via handles
