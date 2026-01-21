<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import HomeView from './views/HomeView.vue'
import SliceBrowserView from './views/SliceBrowserView.vue'
import SourceEditorView from './views/SourceEditorView.vue'
import ProjectView from './views/ProjectView.vue'
import { getAllAudioFiles, getAllSlices, getAllFolders, getAllProjects, saveSlice, saveFolder, saveProject, deleteSlice } from './services/db'
import { processAudioFile } from './services/audio'
import { useAudioPlayback } from './composables/useAudioPlayback'
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts'
import { useDragAndDrop } from './composables/useDragAndDrop'
import { getFileFromHandle } from './services/fileSystem'
import type { Source, Slice, SliceFolder, Project } from './types/models'

type ViewType = 'home' | 'slice-browser' | 'source-editor' | 'project'

interface ViewState {
  view: ViewType
  sourceId?: string
  projectId?: string
}

// Navigation state
const currentView = ref<ViewState>({ view: 'home' })

// Audio playback
const {
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

// Computed values for current view
const currentSource = computed(() => {
  if (currentView.value.view === 'source-editor' && currentView.value.sourceId) {
    return sources.value.find(s => s.id === currentView.value.sourceId) || null
  }
  return null
})

const currentProject = computed(() => {
  if (currentView.value.view === 'project' && currentView.value.projectId) {
    return projects.value.find(p => p.id === currentView.value.projectId) || null
  }
  return null
})

// Navigation functions
const navigateToHome = () => {
  currentView.value = { view: 'home' }
}

const navigateToSliceBrowser = () => {
  currentView.value = { view: 'slice-browser' }
}

const navigateToSourceEditor = (sourceId: string) => {
  currentView.value = { view: 'source-editor', sourceId }
}

const navigateToProject = (projectId: string) => {
  currentView.value = { view: 'project', projectId }
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
}

const handleUpdateSlice = async (slice: Slice) => {
  await saveSlice(slice)
  slices.value = await getAllSlices()
}

const handleUpdateSource = async (source: Source) => {
  await saveAudioFile(source)
  sources.value = await getAllAudioFiles()
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
</script>

<template>
  <div class="app" :class="{ 'is-dragging': isDragging }">
    <!-- Navigation Bar -->
    <nav class="nav-bar">
      <div class="nav-content">
        <div class="nav-brand" @click="navigateToHome">
          🎵 Practice Space
        </div>
        <div class="nav-links">
          <button 
            class="nav-link" 
            :class="{ active: currentView.view === 'home' }"
            @click="navigateToHome"
          >
            Home
          </button>
          <button 
            class="nav-link"
            :class="{ active: currentView.view === 'slice-browser' }"
            @click="navigateToSliceBrowser"
          >
            Slice Browser
          </button>
        </div>
      </div>
    </nav>

    <!-- Views -->
    <main class="main-content">
      <HomeView
        v-if="currentView.view === 'home'"
        :sources="sources"
        :projects="projects"
        :slices="slices"
        @openSource="navigateToSourceEditor"
        @openProject="navigateToProject"
        @filesImported="handleFilesImported"
        @createProject="handleCreateProject"
      />

      <SliceBrowserView
        v-else-if="currentView.view === 'slice-browser'"
        :slices="slices"
        :folders="folders"
        :sources="sources"
        :currentlyPlayingSliceId="currentlyPlayingSliceId"
        :isPlaying="isPlaying"
        @back="navigateToHome"
        @selectSlice="handleSelectSlice"
        @playSlice="handlePlaySlice"
        @createFolder="handleCreateFolder"
        @deleteSlice="handleDeleteSlice"
      />

      <SourceEditorView
        v-else-if="currentView.view === 'source-editor'"
        :source="currentSource"
        :slices="slices"
        :currentlyPlayingSliceId="currentlyPlayingSliceId"
        :isPlaying="isPlaying"
        :currentTime="currentTime"
        :duration="duration"
        :isLoading="isLoading"
        @back="navigateToHome"
        @createSlice="handleCreateSlice"
        @updateSlice="handleUpdateSlice"
        @updateSource="handleUpdateSource"
        @deleteSlice="handleDeleteSlice"
        @selectSlice="handleSelectSlice"
        @playSlice="handlePlaySlice"
        @togglePlayPause="togglePlayPause"
        @stop="stop"
        @seek="seek"
      />

      <ProjectView
        v-else-if="currentView.view === 'project'"
        :project="currentProject"
        :slices="slices"
        :sources="sources"
        :currentlyPlayingSliceId="currentlyPlayingSliceId"
        :isPlaying="isPlaying"
        @back="navigateToHome"
        @playSlice="handlePlaySlice"
        @viewSource="navigateToSourceEditor"
      />
    </main>

    <!-- Drag and Drop Overlay -->
    <div v-if="isDragging" class="drop-overlay">
      <div class="drop-message">
        <div class="drop-icon">📁</div>
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
  background: #1a1a1a;
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
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
  position: relative;
}

.app.is-dragging {
  pointer-events: none;
}

/* Navigation Bar */
.nav-bar {
  background: #1e1e1e;
  border-bottom: 1px solid #333;
  height: 60px;
  flex-shrink: 0;
}

.nav-content {
  max-width: 1400px;
  margin: 0 auto;
  height: 100%;
  padding: 0 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-brand {
  font-size: 1.25rem;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  transition: color 0.2s;
}

.nav-brand:hover {
  color: #4a9eff;
}

.nav-links {
  display: flex;
  gap: 0.5rem;
}

.nav-link {
  background: transparent;
  color: #aaa;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.2s;
}

.nav-link:hover {
  color: #fff;
  background: #2a2a2a;
}

.nav-link.active {
  color: #fff;
  background: #4a9eff;
}

/* Main Content */
.main-content {
  flex: 1;
  overflow: hidden;
}

/* Drag and Drop Overlay */
.drop-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(26, 26, 26, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  pointer-events: auto;
}

.drop-message {
  text-align: center;
  color: #fff;
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
