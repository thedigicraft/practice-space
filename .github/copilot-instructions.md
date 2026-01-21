# Practice Space - Project Setup Instructions

## Project Overview
Local-first, offline-capable web application for musicians built with Vue 3 + Vite.

## Key Architecture Principles
- No backend for MVP
- Everything works offline
- Original audio files never modified
- Persistence via IndexedDB
- Waveform generation in Web Workers
- File System Access API for importing audio
- Web Audio API for playback

## Core Features
- Import folders of audio files
- DAW-like waveform visualization
- Manual region selection and non-destructive slicing
- Filesystem-style browser for organization
- Reusable Projects that can share slices

## Technical Stack
- Vue 3 with Composition API
- TypeScript
- Vite
- IndexedDB (via idb library)
- Web Audio API
- File System Access API
- Web Workers for waveform processing

## Development Guidelines
- Prefer simple, readable implementations
- Avoid premature optimization
- Use modern browser APIs
- No external dependencies for core audio functionality
- Keep components focused and composable
