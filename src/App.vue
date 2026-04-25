<script setup lang="ts">
import { ref, onMounted, provide } from 'vue'
import { useRouter } from 'vue-router'
import { getAllAudioFiles, getAllSlices, getAllFolders, getAllCollections, getAllProjects, saveSlice, saveFolder, saveCollection, saveProject, deleteSlice, saveAudioFile } from './services/db'
import { processAudioFile } from './services/audio'
import { useAudioPlayback } from './composables/useAudioPlayback'
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts'
import { useDragAndDrop } from './composables/useDragAndDrop'
import GeminiChatDrawer from './components/GeminiChatDrawer.vue'
import type { Source, Slice, SliceFolder, Collection, Project } from './types/models'

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
const collections = ref<Collection[]>([])
const projects = ref<Project[]>([])
const selectedSlice = ref<Slice | null>(null)
const isChatDrawerOpen = ref(false)

// Provide data to child components
provide('sources', sources)
provide('slices', slices)
provide('folders', folders)
provide('collections', collections)
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

const navigateToCollection = (collectionId: string) => {
  router.push(`/collection/${collectionId}`)
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
  collections.value = await getAllCollections()
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

const handleCreateCollection = async (collection: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>) => {
  const now = Date.now()
  const newCollection: Collection = {
    ...collection,
    id: `collection-${now}`,
    createdAt: now,
    updatedAt: now,
  }
  
  await saveCollection(newCollection)
  collections.value = await getAllCollections()
}

const handleCollectionCreated = async () => {
  // Reload collections after one is created by the dialog
  collections.value = await getAllCollections()
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
    'collection': 'Collection',
    'collections': 'Collections',
    'project': 'Project',
    'projects': 'Projects',
    'settings': 'Settings'
  }
  
  return names[routeName] || ''
}

const toggleChatDrawer = () => {
  isChatDrawerOpen.value = !isChatDrawerOpen.value
}
</script>

<template>
  <div class="app d-flex text-white" :class="{ 'is-dragging': isDragging }">
    <!-- Activity Bar (VS Code-style) -->
    <aside class="activity-bar d-flex flex-column align-items-center">
      <ul class="activity-list list-unstyled m-0 p-0 w-100">
        <li>
          <router-link to="/" class="activity-item" :class="{ active: $route.name === 'home' }" aria-label="Home">
            <i class="fa-solid fa-house"></i>
          </router-link>
        </li>
        <li>
          <router-link to="/library" class="activity-item" :class="{ active: $route.name === 'library' }" aria-label="Library">
            <i class="fa-solid fa-book"></i>
          </router-link>
        </li>
        <li>
          <router-link to="/sources" class="activity-item" :class="{ active: $route.name === 'sources' }" aria-label="Sources">
            <i class="fa-solid fa-database"></i>
          </router-link>
        </li>
        <li>
          <router-link to="/slices" class="activity-item" :class="{ active: $route.name === 'slice-browser' }" aria-label="Slice Browser">
            <i class="fa-solid fa-scissors"></i>
          </router-link>
        </li>
        <li>
          <router-link to="/collections" class="activity-item" :class="{ active: $route.name === 'collections' || $route.name === 'collection' }" aria-label="Collections">
            <i class="fa-solid fa-folder"></i>
          </router-link>
        </li>
        <li>
          <router-link to="/projects" class="activity-item" :class="{ active: $route.name === 'projects' || $route.name === 'project' }" aria-label="Projects">
            <i class="fa-solid fa-music"></i>
          </router-link>
        </li>
        <li>
          <button
            class="activity-item activity-item--button"
            :class="{ active: isChatDrawerOpen }"
            aria-label="AI Chat"
            @click="toggleChatDrawer"
            type="button"
          >
            <i class="fa-solid fa-robot"></i>
          </button>
        </li>
      </ul>
      <div class="mt-auto w-100">
        <router-link to="/settings" class="activity-item" :class="{ active: $route.name === 'settings' }" aria-label="Settings">
          <i class="fa-solid fa-gear"></i>
        </router-link>
      </div>
    </aside>

    <!-- Views -->
    <main class="main-content flex-fill">
      <router-view
        :sources="sources"
        :slices="slices"
        :folders="folders"
        :collections="collections"
        :projects="projects"
        :currentlyPlayingSliceId="currentlyPlayingSliceId"
        :isPlaying="isPlaying"
        :currentTime="currentTime"
        :duration="duration"
        :isLoading="isLoading"
        @openSource="navigateToSourceEditor"
        @openCollection="navigateToCollection"
        @openProject="navigateToProject"
        @viewSource="navigateToSourceEditor"
        @filesImported="handleFilesImported"
        @createCollection="handleCreateCollection"
        @collectionCreated="handleCollectionCreated"
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

    <GeminiChatDrawer :open="isChatDrawerOpen" @update:open="isChatDrawerOpen = $event" />

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

/* Activity Bar */
.activity-bar {
  width: 56px;
  flex-shrink: 0;
  background-color: rgba(33, 37, 41, 1);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.activity-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 46px;
  color: #adb5bd;
  text-decoration: none;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.activity-item--button {
  border: 0;
  background: transparent;
  cursor: pointer;
}

.activity-item:hover {
  background-color: rgba(255, 255, 255, 0.08);
  color: #e9ecef;
}

.activity-item.active {
  background-color: rgba(13, 110, 253, 0.25);
  color: #ffffff;
}

.activity-item i {
  font-size: 20px;
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
