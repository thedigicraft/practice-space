<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { formatTime } from '@/utils/helpers'
import { exportSlice, type ExportFormat } from '@/utils/audioExport'
import { getSourceArrayBuffer } from '@/services/platformAudio'
import type { Slice, SliceFolder, AudioFile } from '@/types/models'
import ToastNotification from './ToastNotification.vue'
import ExportMenu from './ExportMenu.vue'
import ExportSettings from './ExportSettings.vue'
import FolderNavigationBreadcrumbs from './FolderNavigationBreadcrumbs.vue'
import SliceSelectionToolbar from './SliceSelectionToolbar.vue'
import { useAppSettings } from '@/composables/useAppSettings'

interface Props {
  slices: Slice[]
  folders: SliceFolder[]
  audioFiles: AudioFile[]
  currentlyPlayingSliceId?: string | null
  isPlaying?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  selectSlice: [slice: Slice]
  playSlice: [slice: Slice]
  createFolder: []
  deleteSlice: [sliceId: string]
}>()

const router = useRouter()
const currentFolderId = ref<string | undefined>(undefined)
const searchQuery = ref('')
const selectedSliceIds = ref<Set<string>>(new Set())
const isSelectionMode = ref(false)

// Export dropdown state
const exportDropdownOpen = ref<string | null>(null)

// App settings
const { exportMode } = useAppSettings()

const toggleExportDropdown = (sliceId: string, event?: MouseEvent) => {
  if (event) event.stopPropagation()
  exportDropdownOpen.value = exportDropdownOpen.value === sliceId ? null : sliceId
}

const closeExportDropdown = () => {
  exportDropdownOpen.value = null
}

// Toast notification state
const toastVisible = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error' | 'info' | 'loading'>('info')
const toastProgress = ref<number | undefined>(undefined)

const showToast = (message: string, type: 'success' | 'error' | 'info' | 'loading', progress?: number) => {
  toastMessage.value = message
  toastType.value = type
  toastProgress.value = progress
  toastVisible.value = true
}

const hideToast = () => {
  toastVisible.value = false
  toastProgress.value = undefined
}

// Get current folder
const currentFolder = computed(() => {
  if (!currentFolderId.value) return null
  return props.folders.find(f => f.id === currentFolderId.value)
})

// Get child folders of current folder
const childFolders = computed(() => {
  return props.folders.filter(f => f.parentId === currentFolderId.value)
})

// Get slices in current folder
const currentSlices = computed(() => {
  let slices: Slice[]
  
  if (currentFolderId.value) {
    const folder = currentFolder.value
    if (!folder) return []
    slices = props.slices.filter(s => folder.sliceIds.includes(s.id))
  } else {
    // Root level: show slices not in any folder
    const slicesInFolders = new Set<string>()
    props.folders.forEach(f => {
      f.sliceIds.forEach(id => slicesInFolders.add(id))
    })
    slices = props.slices.filter(s => !slicesInFolders.has(s.id))
  }
  
  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    slices = slices.filter(slice => {
      // Search in title
      if (slice.title?.toLowerCase().includes(query)) return true
      
      // Search in tags
      if (slice.tags?.some(tag => tag.toLowerCase().includes(query))) return true
      
      // Search in composers
      if (slice.composers?.some(composer => composer.toLowerCase().includes(query))) return true
      
      // Search in performers
      if (slice.performers?.some(performer => performer.toLowerCase().includes(query))) return true
      
      // Search in type
      if (slice.type?.toLowerCase().includes(query)) return true
      
      // Search in source file name
      const sourceFile = props.audioFiles.find(f => f.id === slice.audioFileId)
      if (sourceFile?.name.toLowerCase().includes(query)) return true
      
      // Search in source file location
      if (sourceFile?.location?.toLowerCase().includes(query)) return true
      
      return false
    })
  }
  
  return slices
})

// Search across all slices (ignoring folders)
const globalSearchResults = computed(() => {
  if (!searchQuery.value.trim()) return []
  
  const query = searchQuery.value.toLowerCase()
  return props.slices.filter(slice => {
    // Search in title
    if (slice.title?.toLowerCase().includes(query)) return true
    
    // Search in tags
    if (slice.tags?.some(tag => tag.toLowerCase().includes(query))) return true
    
    // Search in composers
    if (slice.composers?.some(composer => composer.toLowerCase().includes(query))) return true
    
    // Search in performers
    if (slice.performers?.some(performer => performer.toLowerCase().includes(query))) return true
    
    // Search in type
    if (slice.type?.toLowerCase().includes(query)) return true
    
    // Search in source file name
    const sourceFile = props.audioFiles.find(f => f.id === slice.audioFileId)
    if (sourceFile?.name.toLowerCase().includes(query)) return true
    
    // Search in source file location
    if (sourceFile?.location?.toLowerCase().includes(query)) return true
    
    return false
  })
})

// Show global results when searching
const displaySlices = computed(() => {
  return searchQuery.value.trim() ? globalSearchResults.value : currentSlices.value
})

// Get audio file name for a slice
const getAudioFileName = (audioFileId: string): string => {
  const file = props.audioFiles.find(f => f.id === audioFileId)
  return file?.name || 'Unknown'
}

// Navigation
const navigateToFolder = (folderId?: string) => {
  currentFolderId.value = folderId
}

// Breadcrumb navigation
const breadcrumbs = computed(() => {
  const crumbs: Array<{ id?: string; name: string }> = [
    { id: undefined, name: 'Root' }
  ]
  
  if (currentFolderId.value) {
    let folderId: string | undefined = currentFolderId.value
    const path: Array<{ id: string; name: string }> = []
    
    while (folderId) {
      const folder = props.folders.find(f => f.id === folderId)
      if (!folder) break
      
      path.unshift({ id: folder.id, name: folder.name })
      folderId = folder.parentId
    }
    
    crumbs.push(...path)
  }
  
  return crumbs
})

// Selection management
const toggleSelection = (sliceId: string, event: MouseEvent) => {
  event.stopPropagation()
  if (selectedSliceIds.value.has(sliceId)) {
    selectedSliceIds.value.delete(sliceId)
  } else {
    selectedSliceIds.value.add(sliceId)
  }
}

const selectAll = () => {
  displaySlices.value.forEach(slice => selectedSliceIds.value.add(slice.id))
}

const deselectAll = () => {
  selectedSliceIds.value.clear()
  isSelectionMode.value = false
}

const toggleSelectionMode = () => {
  isSelectionMode.value = !isSelectionMode.value
  if (!isSelectionMode.value) {
    selectedSliceIds.value.clear()
  }
}

// Batch operations
const deleteSelected = async () => {
  if (selectedSliceIds.value.size === 0) return
  
  const count = selectedSliceIds.value.size
  if (!confirm(`Delete ${count} slice${count > 1 ? 's' : ''}? This cannot be undone.`)) {
    return
  }
  
  for (const sliceId of selectedSliceIds.value) {
    emit('deleteSlice', sliceId)
  }
  
  selectedSliceIds.value.clear()
  isSelectionMode.value = false
}

const exportSelected = async () => {
  if (selectedSliceIds.value.size === 0) return
  
  const slicesToExport = displaySlices.value.filter(s => selectedSliceIds.value.has(s.id))
  const total = slicesToExport.length
  let completed = 0
  let failed = 0
  
  showToast(`Exporting ${total} slice${total > 1 ? 's' : ''}...`, 'loading', 0)
  
  for (const slice of slicesToExport) {
    try {
      const audioFile = props.audioFiles.find(f => f.id === slice.audioFileId)
      if (!audioFile) {
        failed++
        continue
      }
      // Load source across web/Android platforms
      const arrayBuffer = await getSourceArrayBuffer(audioFile)
      const audioContext = new AudioContext()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      await exportSlice(
        audioBuffer,
        slice.startTime,
        slice.endTime,
        slice.title || `slice-${slice.id.slice(0, 8)}`,
        slice,
        { format: 'wav', quality: 90, includeMetadata: true, mode: exportMode }
      )
      
      await audioContext.close()
      completed++
      
      // Update progress
      const progress = Math.round((completed / total) * 100)
      showToast(`Exporting... ${completed}/${total}`, 'loading', progress)
      
      // Small delay between exports to prevent browser blocking
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      console.error(`Failed to export slice ${slice.id}:`, error)
      failed++
    }
  }
  
  // Show final result
  if (failed === 0) {
    showToast(`Successfully exported ${completed} slice${completed > 1 ? 's' : ''}!`, 'success')
  } else if (completed > 0) {
    showToast(`Exported ${completed} slice${completed > 1 ? 's' : ''}, ${failed} failed`, 'info')
  } else {
    showToast(`Failed to export slices`, 'error')
  }
}

const handlePlaySlice = (slice: Slice, event: MouseEvent) => {
  event.stopPropagation()
  emit('playSlice', slice)
}

const handleExportSlice = async (slice: Slice, format: ExportFormat) => {
  closeExportDropdown()
  
  const formatLabel = format.toUpperCase()
  showToast(`Exporting "${slice.title}" as ${formatLabel}...`, 'loading', format === 'mp3' ? 0 : undefined)
  
  try {
    // Find the audio file
    const audioFile = props.audioFiles.find(f => f.id === slice.audioFileId)
    if (!audioFile) {
      showToast('Audio file not found for slice', 'error')
      return
    }
  // Load and decode the source (web or Android)
    const arrayBuffer = await getSourceArrayBuffer(audioFile)
    const audioContext = new AudioContext()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    // Export the slice with metadata and progress tracking
    await exportSlice(
      audioBuffer,
      slice.startTime,
      slice.endTime,
      slice.title || `slice-${slice.id.slice(0, 8)}`,
      slice,
      { 
        format, 
        quality: 90, 
        includeMetadata: true,
        mode: exportMode,
        onProgress: format === 'mp3' ? (progress) => {
          showToast(`Exporting "${slice.title}" as ${formatLabel}... ${progress}%`, 'loading', progress)
        } : undefined
      }
    )

    await audioContext.close()
    showToast(`Successfully exported "${slice.title}" as ${formatLabel}!`, 'success')
  } catch (error) {
    console.error('Failed to export slice:', error)
    showToast(`Failed to export: ${(error as Error).message}`, 'error')
  }
}

const filterByArtist = (artistName: string, event: MouseEvent) => {
  event.stopPropagation()
  searchQuery.value = artistName
  // Clear folder navigation to show global search results
  currentFolderId.value = undefined
}

const filterByType = (type: string, event: MouseEvent) => {
  event.stopPropagation()
  searchQuery.value = type
  // Clear folder navigation to show global search results
  currentFolderId.value = undefined
}

const filterByLocation = (location: string, event: MouseEvent) => {
  event.stopPropagation()
  router.push({
    path: '/slices',
    query: { location }
  })
}

// Expose method for parent to set filter
defineExpose({
  setSearchFilter: (filter: string) => {
    searchQuery.value = filter
    currentFolderId.value = undefined
  }
})
</script>

<template>
  <div class="file-browser d-flex flex-column">
    <!-- Breadcrumb navigation -->
    <FolderNavigationBreadcrumbs
      :breadcrumbs="breadcrumbs"
      @navigate="navigateToFolder"
    />

    <!-- Toolbar -->
    <div class="toolbar py-3 px-3 d-flex gap-3 align-items-center">
      <div class="search-box flex-fill d-flex align-items-center">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search slices by title, tags, or file..."
          class="form-control"
        />
        <button
          v-if="searchQuery"
          @click="searchQuery = ''"
          class="btn btn-sm btn-outline-secondary"
          title="Clear search"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
      <button 
        @click="toggleSelectionMode" 
        class="btn btn-outline-secondary"
        :class="{ 'active': isSelectionMode }"
      >
        {{ isSelectionMode ? '✓ Selection Mode' : '☑ Select' }}
      </button>
      <button @click="emit('createFolder')" class="btn btn-outline-secondary">
        <i class="fas fa-folder-plus me-2"></i>New Folder
      </button>
      <ExportSettings />
    </div>

    <!-- Batch actions bar -->
    <div v-if="isSelectionMode" class="batch-actions py-2 px-3 d-flex align-items-center justify-content-between gap-3">
      <div class="selection-info">
        {{ selectedSliceIds.size }} selected
      </div>
      <div class="action-buttons d-flex gap-2">
        <button @click="selectAll" class="btn btn-sm btn-outline-secondary">Select All</button>
        <button @click="deselectAll" class="btn btn-sm btn-outline-secondary">Clear</button>
        <button 
          @click="exportSelected" 
          class="btn btn-sm btn-success"
          :disabled="selectedSliceIds.size === 0"
        >
          <i class="fas fa-download me-1"></i>Export ({{ selectedSliceIds.size }})
        </button>
        <button 
          @click="deleteSelected" 
          class="btn btn-sm btn-danger"
          :disabled="selectedSliceIds.size === 0"
        >
          <i class="fas fa-trash me-1"></i>Delete ({{ selectedSliceIds.size }})
        </button>
      </div>
    </div>

    <!-- Search info -->
    <div v-if="searchQuery.trim()" class="search-info">
      Showing {{ displaySlices.length }} result{{ displaySlices.length !== 1 ? 's' : '' }} for "{{ searchQuery }}"
    </div>

    <!-- Browser content -->
    <div class="browser-content">
      <!-- Empty state -->
      <div v-if="childFolders.length === 0 && displaySlices.length === 0" class="empty-state">
        <p v-if="searchQuery.trim()">No slices found matching "{{ searchQuery }}"</p>
        <p v-else>No folders or slices here</p>
        <p class="hint">Create slices from audio regions or organize them in folders</p>
      </div>

      <!-- Folders list -->
      <div v-if="childFolders.length > 0 && !searchQuery.trim()" class="folders-section">
        <div
          v-for="folder in childFolders"
          :key="folder.id"
          class="folder-item d-flex align-items-center gap-2"
          @click="navigateToFolder(folder.id)"
        >
          <span class="folder-icon"><i class="fas fa-folder"></i></span>
          <span class="folder-name flex-fill">{{ folder.name }}</span>
          <span class="folder-count">({{ folder.sliceIds.length }})</span>
        </div>
      </div>

      <!-- Slices list -->
      <div v-if="displaySlices.length > 0" class="slices-section">
        <div
          v-for="slice in displaySlices"
          :key="slice.id"
          class="slice-item-browser d-flex align-items-start gap-2"
          :class="{ 
            'is-playing': slice.id === currentlyPlayingSliceId,
            'is-selected': selectedSliceIds.has(slice.id)
          }"
          @click="emit('selectSlice', slice)"
        >
          <input
            v-if="isSelectionMode"
            type="checkbox"
            class="slice-checkbox"
            :checked="selectedSliceIds.has(slice.id)"
            @click="toggleSelection(slice.id, $event)"
          />
          <button 
            class="btn btn-primary btn-sm play-btn-slice"
            @click="handlePlaySlice(slice, $event)"
            title="Play slice"
          >
            <span v-if="slice.id === currentlyPlayingSliceId && isPlaying" class="playing-icon"><i class="fas fa-pause"></i></span>
            <span v-else><i class="fas fa-play"></i></span>
          </button>
          <div class="slice-icon">🎵</div>
          <div class="slice-details flex-fill">
            <div class="slice-grid">
              <div class="grid-col title-col d-flex flex-column gap-1">
                <div class="slice-title">{{ slice.title }}</div>
                <div class="slice-source">{{ getAudioFileName(slice.audioFileId) }}</div>
              </div>
              <div class="grid-col composer-col">
                <div class="col-label">Composer</div>
                <div class="col-value">
                  <span v-if="slice.composers && slice.composers.length > 0">
                    <a
                      v-for="(composer, idx) in slice.composers"
                      :key="composer"
                      @click="filterByArtist(composer, $event)"
                      class="artist-link"
                    >
                      {{ composer }}<span v-if="idx < slice.composers.length - 1">, </span>
                    </a>
                  </span>
                  <span v-else>—</span>
                </div>
              </div>
              <div class="grid-col performer-col">
                <div class="col-label">Performer</div>
                <div class="col-value">
                  <span v-if="slice.performers && slice.performers.length > 0">
                    <a
                      v-for="(performer, idx) in slice.performers"
                      :key="performer"
                      @click="filterByArtist(performer, $event)"
                      class="artist-link"
                    >
                      {{ performer }}<span v-if="idx < slice.performers.length - 1">, </span>
                    </a>
                  </span>
                  <span v-else>—</span>
                </div>
              </div>
              <div class="grid-col type-col">
                <div class="col-label">Type</div>
                <div class="col-value">
                  <a
                    v-if="slice.type"
                    @click="filterByType(slice.type, $event)"
                    class="type-link"
                  >
                    {{ slice.type }}
                  </a>
                  <span v-else>—</span>
                </div>
              </div>
              <div class="grid-col location-col">
                <div class="col-label">Location</div>
                <div class="col-value">
                  <a
                    v-if="audioFiles.find(f => f.id === slice.audioFileId)?.location"
                    @click="filterByLocation(audioFiles.find(f => f.id === slice.audioFileId)!.location!, $event)"
                    class="location-link"
                  >
                    <i class="fas fa-map-marker-alt me-1"></i>
                    {{ audioFiles.find(f => f.id === slice.audioFileId)?.location }}
                  </a>
                  <span v-else>—</span>
                </div>
              </div>
              <div class="grid-col duration-col">
                <div class="col-label">Duration</div>
                <div class="col-value duration-value">{{ formatTime(slice.endTime - slice.startTime) }}</div>
              </div>
            </div>
            <div v-if="slice.tags?.length" class="slice-tags-compact d-flex gap-1 flex-wrap">
              <span v-for="tag in slice.tags" :key="tag" class="tag-compact">
                {{ tag }}
              </span>
            </div>
          </div>
          <ExportMenu
            :is-open="exportDropdownOpen === slice.id"
            @toggle="() => toggleExportDropdown(slice.id)"
            @export="(format) => handleExportSlice(slice, format)"
          />
        </div>
      </div>
    </div>
  </div>
  
  <!-- Toast Notification -->
  <ToastNotification
    :visible="toastVisible"
    :message="toastMessage"
    :type="toastType"
    :progress="toastProgress"
    @close="hideToast"
  />
</template>

<style scoped lang="scss">
.file-browser {
  height: 100%;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.toolbar {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.search-box {
  position: relative;
}

.search-info {
  padding: 0.5rem 1rem;
  background: rgba(74, 158, 255, 0.1);
  border-bottom: 1px solid rgba(74, 158, 255, 0.2);
  color: #4a9eff;
  font-size: 0.85rem;
}

.browser-content {
  overflow-y: auto;
  padding: 1rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  opacity: 0.5;
}

.empty-state p {
  margin: 0.5rem 0;
}

.hint {
  font-size: 0.85rem;
}

.folders-section,
.slices-section {
  margin-bottom: 1rem;
}

.folder-item {
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 0.5rem;
}

.folder-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(74, 158, 255, 0.3);
}

.folder-icon {
  font-size: 1.5rem;
}

.folder-name {
  font-weight: 500;
}

.folder-count {
  font-size: 0.85rem;
  opacity: 0.7;
}

.slice-item-browser {
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 0.5rem;
}

.slice-item-browser.is-selected {
  background: rgba(74, 158, 255, 0.1);
  border-color: rgba(74, 158, 255, 0.4);
}

.slice-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #4a9eff;
  flex-shrink: 0;
  margin-top: 0.25rem;
}

.slice-item-browser.is-playing {
  background: rgba(74, 158, 255, 0.15);
  border-color: rgba(74, 158, 255, 0.5);
  box-shadow: 0 0 20px rgba(74, 158, 255, 0.2);
}

.playing-icon {
  display: inline-block;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

.play-btn-slice {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(74, 158, 255, 0.5);
  background: rgba(74, 158, 255, 0.1);
  color: #4a9eff;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.play-btn-slice:hover {
  background: rgba(74, 158, 255, 0.2);
  transform: scale(1.1);
}

.export-dropdown-container {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(74, 158, 255, 0.3);
}

.slice-icon {
  font-size: 1.5rem;
  line-height: 1;
}

.slice-details {
  min-width: 0;
}

.slice-grid {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1.5fr 1fr 1.2fr 100px;
  gap: 1rem;
  margin-bottom: 0.5rem;
  align-items: start;
}

.grid-col {
  min-width: 0;
}

.title-col {
}

.slice-title {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slice-source {
  font-size: 0.85rem;
  opacity: 0.6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  opacity: 0.5;
  margin-bottom: 0.25rem;
  letter-spacing: 0.5px;
}

.col-value {
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.artist-link {
  color: #4a9eff;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
}

.artist-link:hover {
  color: #6bb3ff;
  text-decoration: underline;
}

.type-link {
  color: #9d4aff;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
}

.type-link:hover {
  color: #b36bff;
  text-decoration: underline;
}

.location-link {
  color: #9d4aff;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
}

.location-link:hover {
  color: #b36bff;
  text-decoration: underline;
}

.duration-value {
  font-family: 'Courier New', monospace;
  font-weight: 500;
}

.slice-tags-compact {
}

.tag-compact {
  padding: 0.125rem 0.5rem;
  background: rgba(74, 158, 255, 0.15);
  border-radius: 8px;
  font-size: 0.75rem;
  color: #4a9eff;
}

.play-btn-slice {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(74, 158, 255, 0.15);
  border: 1px solid rgba(74, 158, 255, 0.3);
  color: #4a9eff;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  padding-left: 2px;
  flex-shrink: 0;
}

.play-btn-slice:hover {
  background: rgba(74, 158, 255, 0.25);
  border-color: rgba(74, 158, 255, 0.5);
  transform: scale(1.1);
}

.play-btn-slice:active {
  transform: scale(0.95);
}
</style>
