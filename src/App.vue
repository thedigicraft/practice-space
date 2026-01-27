<script setup lang="ts">
import { ref, onMounted, provide } from 'vue'
import { useRouter } from 'vue-router'
import { getAllAudioFiles, getAllSlices, getAllFolders, getAllProjects, saveSlice, saveFolder, saveProject, deleteSlice, saveAudioFile } from './services/db'
import { processAudioFile } from './services/audio'
import { useAudioPlayback } from './composables/useAudioPlayback'
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts'
import { useDragAndDrop } from './composables/useDragAndDrop'
import type { Source, Slice, SliceFolder, Project } from './types/models'

const router = useRouter()

// Audio playback
const {
  isPlaying,
  currentTime,
  duration,
  isLoading,
  currentlyPlayingFileId,
  currentlyPlayingSliceId,
  loadAudioFile,
  playAudioFile,
  playSlice,
  togglePlayPause,
  seek,
  stop,
} = useAudioPlayback()

// Keyboard shortcuts
useKeyboardShortcuts({
  onPlayPause: togglePlayPause,
  onSeekForward: () => {
    if (duration.value > 0) {
      seek(Math.min(currentTime.value + 5, duration.value))
    }
  },
  onSeekBackward: () => {
    if (duration.value > 0) {
      seek(Math.max(currentTime.value - 5, 0))
    }
  },
  onStop: stop,
})

// Data
const sources = ref<Source[]>([])
const slices = ref<Slice[]>([])
const folders = ref<SliceFolder[]>([])
const projects = ref<Project[]>([])
const selectedSlice = ref<Slice | null>(null)

// Provide data to child components
provide('sources', sources)
provide('slices', slices)
provide('folders', folders)
provide('projects', projects)
provide('audioPlayback', {
  isPlaying,
  currentTime,
  duration,
  isLoading,
  currentlyPlayingFileId,
  currentlyPlayingSliceId,
  playAudioFile,
  playSlice,
  togglePlayPause,
  seek,
  stop,
})

// Navigation functions using router
const navigateToHome = () => {
  router.push('/')
}

const navigateToSliceBrowser = () => {
  router.push('/slices')
}

const navigateToSourceEditor = (sourceId: string) => {
  router.push(`/source/${sourceId}`)
}

const navigateToProject = (projectId: string) => {
  router.push(`/project/${projectId}`)
}

// File import handling
const handleDroppedFiles = async (files: File[]) => {
  const processedFiles: Source[] = []
  
  for (const file of files) {
    try {
      const audioFile = await processAudioFile(file)
      processedFiles.push(audioFile)
    } catch (error) {
      console.error(`Failed to process ${file.name}:`, error)
    }
  }
  
  if (processedFiles.length > 0) {
    await handleFilesImported(processedFiles)
  }
}

// Drag and drop
const { isDragging } = useDragAndDrop({
  onFilesDropped: handleDroppedFiles,
  acceptedTypes: ['audio/*'],
})

onMounted(async () => {
  // Load existing data from IndexedDB
  sources.value = await getAllAudioFiles()
  slices.value = await getAllSlices()
  folders.value = await getAllFolders()
  projects.value = await getAllProjects()
})

const handleFilesImported = async (files: Source[]) => {
  sources.value = await getAllAudioFiles()
}

const handleSelectSlice = (slice: Slice) => {
  selectedSlice.value = slice
}

const handleLoadAudioFile = async (source: Source) => {
  try {
    await loadAudioFile(source)
  } catch (error) {
    console.error('Failed to load audio file:', error)
  }
}

const handlePlaySlice = async (slice: Slice) => {
  // Find the source file
  const source = sources.value.find(f => f.id === slice.audioFileId)
  if (!source) return

  try {
    await playSlice(slice, source)
  } catch (error) {
    console.error('Failed to play slice:', error)
  }
}

const handleCreateSlice = async (slice: Omit<Slice, 'id' | 'createdAt' | 'updatedAt'>) => {
  const now = Date.now()
  const newSlice: Slice = {
    ...slice,
    id: `slice-${now}`,
    createdAt: now,
    updatedAt: now,
  }
  
  await saveSlice(newSlice)
  slices.value = await getAllSlices()
  
  return newSlice.id
}

const handleUpdateSlice = async (slice: Slice) => {
  await saveSlice(slice)
  slices.value = await getAllSlices()
}

const handleUpdateSource = async (sourceId: string, metadata: Partial<Source>) => {
  const source = sources.value.find(s => s.id === sourceId)
  if (source) {
    const updatedSource = { ...source, ...metadata }
    await saveAudioFile(updatedSource)
    sources.value = await getAllAudioFiles()
  }
}

const handleDeleteSlice = async (sliceId: string) => {
  await deleteSlice(sliceId)
  slices.value = await getAllSlices()
  
  // Clear selection if the deleted slice was selected
  if (selectedSlice.value?.id === sliceId) {
    selectedSlice.value = null
  }
}

const handleCreateFolder = async (folder: Omit<SliceFolder, 'id' | 'createdAt'>) => {
  const now = Date.now()
  const newFolder: SliceFolder = {
    ...folder,
    id: `folder-${now}`,
    createdAt: now,
  }
  
  await saveFolder(newFolder)
  folders.value = await getAllFolders()
}

const handleCreateProject = async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
  const now = Date.now()
  const newProject: Project = {
    ...project,
    id: `project-${now}`,
    createdAt: now,
    updatedAt: now,
  }
  
  await saveProject(newProject)
  projects.value = await getAllProjects()
}

const handleProjectCreated = async () => {
  // Reload projects after one is created by the dialog
  projects.value = await getAllProjects()
}

const getViewName = (routeName: string | symbol | null | undefined): string => {
  if (!routeName || typeof routeName !== 'string') return ''
  
  const names: Record<string, string> = {
    'library': 'Library',
    'sources': 'Sources',
    'source-editor': 'Source Editor',
    'slice-browser': 'Slice Browser',
    'grouped-slices': 'Grouped Slices',
    'project': 'Project',
    'projects': 'Projects',
    'settings': 'Settings'
  }
  
  return names[routeName] || ''
}
</script>

<template>
  <div class="app d-flex flex-column xbg-dark text-white" :class="{ 'is-dragging': isDragging }">
    <!-- Navigation Bar -->
    <nav class="navbar navbar-expand xbg-body border-bottom">
      <div class="container-fluid px-4">
        <a class="navbar-brand text-white" @click="navigateToHome" role="button">
          Practice Space
          <span v-if="$route.name !== 'home'" class="view-name text-muted">/ {{ getViewName($route.name) }}</span>
        </a>
        <ul class="navbar-nav ms-auto gap-2">
          <li class="nav-item">
            <button 
              class="nav-link btn btn-sm" 
              :class="{ 'btn-primary': $route.name === 'home', 'btn-outline-secondary': $route.name !== 'home' }"
              @click="navigateToHome"
            >
              Home
            </button>
          </li>
          <li class="nav-item">
            <button 
              class="nav-link btn btn-sm"
              :class="{ 'btn-primary': $route.name === 'library', 'btn-outline-secondary': $route.name !== 'library' }"
              @click="() => router.push('/library')"
            >
              Library
            </button>
          </li>
          <li class="nav-item">
            <button 
              class="nav-link btn btn-sm"
              :class="{ 'btn-primary': $route.name === 'sources', 'btn-outline-secondary': $route.name !== 'sources' }"
              @click="() => router.push('/sources')"
            >
              Sources
            </button>
          </li>
          <li class="nav-item">
            <button 
              class="nav-link btn btn-sm"
              :class="{ 'btn-primary': $route.name === 'slice-browser', 'btn-outline-secondary': $route.name !== 'slice-browser' }"
              @click="navigateToSliceBrowser"
            >
              Slice Browser
            </button>
          </li>
          <li class="nav-item">
            <button 
              class="nav-link btn btn-sm"
              :class="{ 'btn-primary': $route.name === 'settings', 'btn-outline-secondary': $route.name !== 'settings' }"
              @click="() => router.push('/settings')"
            >
              Settings
            </button>
          </li>
        </ul>
      </div>
    </nav>

    <!-- Views -->
    <main class="main-content flex-fill">
      <router-view
        :sources="sources"
        :slices="slices"
        :folders="folders"
        :projects="projects"
        :currentlyPlayingSliceId="currentlyPlayingSliceId"
        :isPlaying="isPlaying"
        :currentTime="currentTime"
        :duration="duration"
        :isLoading="isLoading"
        @openSource="navigateToSourceEditor"
        @openProject="navigateToProject"
        @viewSource="navigateToSourceEditor"
        @filesImported="handleFilesImported"
        @createProject="handleCreateProject"
        @projectCreated="handleProjectCreated"
        @createFolder="handleCreateFolder"
        @createSlice="handleCreateSlice"
        @updateSlice="handleUpdateSlice"
        @updateSource="handleUpdateSource"
        @deleteSlice="handleDeleteSlice"
        @selectSlice="handleSelectSlice"
        @playSlice="handlePlaySlice"
        @loadAudioFile="handleLoadAudioFile"
        @togglePlayPause="togglePlayPause"
        @stop="stop"
        @seek="seek"
        @back="navigateToHome"
      />
    </main>

    <!-- Drag and Drop Overlay -->
    <div v-if="isDragging" class="drop-overlay d-flex align-items-center justify-content-center">
      <div class="drop-message">
        <div class="drop-icon"><i class="fas fa-folder-open fa-3x"></i></div>
        <p>Drop audio files here to import</p>
      </div>
    </div>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  /* background: #1a1a1a; */
  color: #e0e0e0;
  overflow: hidden;
}

#app {
  height: 100vh;
  overflow: hidden;
}
</style>

<style scoped>
.app {
  height: 100vh;
  position: relative;
}

.app.is-dragging {
  pointer-events: none;
}

/* Navigation Bar */
.navbar {
  height: 60px;
  flex-shrink: 0;
}

.navbar-brand {
  font-size: 1.25rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.navbar-brand:hover {
  opacity: 0.8;
}

.view-name {
  font-weight: 400;
  font-size: 1rem;
}

.nav-item .nav-link {
  font-size: 0.95rem;
  font-weight: 500;
}

/* Main Content */
.main-content {
  overflow-y: auto;
  overflow-x: hidden;
}

/* Drag and Drop Overlay */
.drop-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  /* background: rgba(var(--bs-dark-rgb), 0.95); */
  z-index: 1000;
  pointer-events: auto;
}

.drop-message {
  text-align: center;
}

.drop-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  animation: bounce 1s infinite;
}

.drop-message p {
  font-size: 1.5rem;
  margin: 0;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}
</style>
