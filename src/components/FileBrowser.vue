<script setup lang="ts">
import { ref, computed } from 'vue'
import { formatTime } from '@/utils/helpers'
import { exportSlice, type ExportFormat } from '@/utils/audioExport'
import { getFileFromHandle } from '@/services/fileSystem'
import type { Slice, SliceFolder, AudioFile } from '@/types/models'
import ToastNotification from './ToastNotification.vue'

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

const currentFolderId = ref<string | undefined>(undefined)
const searchQuery = ref('')
const selectedSliceIds = ref<Set<string>>(new Set())
const isSelectionMode = ref(false)

// Export dropdown state
const exportDropdownOpen = ref<string | null>(null)

const toggleExportDropdown = (sliceId: string, event: MouseEvent) => {
  event.stopPropagation()
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
      
      const file = await getFileFromHandle(audioFile.fileHandle)
      const arrayBuffer = await file.arrayBuffer()
      const audioContext = new AudioContext()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      await exportSlice(
        audioBuffer,
        slice.startTime,
        slice.endTime,
        slice.title || `slice-${slice.id.slice(0, 8)}`,
        slice,
        { format: 'wav', quality: 90, includeMetadata: true }
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

const handleExportSlice = async (slice: Slice, format: ExportFormat, event: MouseEvent) => {
  event.stopPropagation()
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
  // Load and decode the audio file
    const file = await getFileFromHandle(audioFile.fileHandle)
    const arrayBuffer = await file.arrayBuffer()
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

// Expose method for parent to set filter
defineExpose({
  setSearchFilter: (filter: string) => {
    searchQuery.value = filter
    currentFolderId.value = undefined
  }
})
</script>

<template>
  <div class="file-browser">
    <!-- Breadcrumb navigation -->
    <div class="breadcrumb py-3 px-3">
      <span
        v-for="(crumb, index) in breadcrumbs"
        :key="crumb.id || 'root'"
        class="breadcrumb-item"
      >
        <button
          @click="navigateToFolder(crumb.id)"
          class="breadcrumb-link"
          :class="{ active: index === breadcrumbs.length - 1 }"
        >
          {{ crumb.name }}
        </button>
        <span v-if="index < breadcrumbs.length - 1" class="breadcrumb-sep">/</span>
      </span>
    </div>

    <!-- Toolbar -->
    <div class="toolbar py-3 px-3">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search slices by title, tags, or file..."
          class="form-control"
        />
        <button
          v-if="searchQuery"
          @click="searchQuery = ''"
          class="btn-clear-search"
          title="Clear search"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
      <button 
        @click="toggleSelectionMode" 
        class="btn-toolbar"
        :class="{ 'active': isSelectionMode }"
      >
        {{ isSelectionMode ? '✓ Selection Mode' : '☑ Select' }}
      </button>
      <button @click="emit('createFolder')" class="btn-toolbar">
        <i class="fas fa-folder-plus"></i> New Folder
      </button>
    </div>

    <!-- Batch actions bar -->
    <div v-if="isSelectionMode" class="batch-actions py-2 px-3">
      <div class="selection-info">
        {{ selectedSliceIds.size }} selected
      </div>
      <div class="action-buttons">
        <button @click="selectAll" class="btn-action">Select All</button>
        <button @click="deselectAll" class="btn-action">Clear</button>
        <button 
          @click="exportSelected" 
          class="btn-action btn-export"
          :disabled="selectedSliceIds.size === 0"
        >
          💾 Export ({{ selectedSliceIds.size }})
        </button>
        <button 
          @click="deleteSelected" 
          class="btn-action btn-delete"
          :disabled="selectedSliceIds.size === 0"
        >
          🗑 Delete ({{ selectedSliceIds.size }})
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
          class="folder-item"
          @click="navigateToFolder(folder.id)"
        >
          <span class="folder-icon"><i class="fas fa-folder"></i></span>
          <span class="folder-name">{{ folder.name }}</span>
          <span class="folder-count">({{ folder.sliceIds.length }})</span>
        </div>
      </div>

      <!-- Slices list -->
      <div v-if="displaySlices.length > 0" class="slices-section">
        <div
          v-for="slice in displaySlices"
          :key="slice.id"
          class="slice-item-browser"
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
            class="play-btn-slice"
            @click="handlePlaySlice(slice, $event)"
            title="Play slice"
          >
            <span v-if="slice.id === currentlyPlayingSliceId && isPlaying" class="playing-icon"><i class="fas fa-pause"></i></span>
            <span v-else><i class="fas fa-play"></i></span>
          </button>
          <div class="slice-icon">🎵</div>
          <div class="slice-details">
            <div class="slice-grid">
              <div class="grid-col title-col">
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
              <div class="grid-col duration-col">
                <div class="col-label">Duration</div>
                <div class="col-value duration-value">{{ formatTime(slice.endTime - slice.startTime) }}</div>
              </div>
            </div>
            <div v-if="slice.tags?.length" class="slice-tags-compact">
              <span v-for="tag in slice.tags" :key="tag" class="tag-compact">
                {{ tag }}
              </span>
            </div>
          </div>
          <div class="dropdown">
            <button 
              class="btn btn-sm btn-success dropdown-toggle"
              type="button"
              @click="toggleExportDropdown(slice.id, $event)"
            >
              💾
            </button>
            <ul v-if="exportDropdownOpen === slice.id" class="dropdown-menu show" style="right: 0; left: auto;">
              <li>
                <button class="dropdown-item" @click="handleExportSlice(slice, 'wav', $event)">
                  <i class="fas fa-wave-square me-2"></i> WAV (Instant, Lossless)
                </button>
              </li>
              <li>
                <button class="dropdown-item" @click="handleExportSlice(slice, 'mp3', $event)">
                  <i class="fas fa-music me-2"></i> MP3 (Compressed)
                </button>
              </li>
            </ul>
          </div>
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

<style scoped>
.file-browser {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.breadcrumb {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.9rem;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
}

.breadcrumb-link {
  background: none;
  border: none;
  color: #4a9eff;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.breadcrumb-link:hover {
  background: rgba(74, 158, 255, 0.1);
}

.breadcrumb-link.active {
  color: inherit;
  cursor: default;
}

.breadcrumb-link.active:hover {
  background: none;
}

.breadcrumb-sep {
  margin: 0 0.25rem;
  opacity: 0.5;
}

.toolbar {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  gap: 1rem;
  align-items: center;
}

.search-box {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}



.btn-clear-search {
  position: absolute;
  right: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 4px;
  color: inherit;
  cursor: pointer;
  opacity: 0.6;
  transition: all 0.2s;
}

.btn-clear-search:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.2);
}

.search-info {
  padding: 0.5rem 1rem;
  background: rgba(74, 158, 255, 0.1);
  border-bottom: 1px solid rgba(74, 158, 255, 0.2);
  color: #4a9eff;
  font-size: 0.85rem;
}

.btn-toolbar {
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: inherit;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.btn-toolbar.active {
  background: rgba(74, 158, 255, 0.2);
  border-color: rgba(74, 158, 255, 0.5);
  color: #4a9eff;
}

.btn-toolbar:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.3);
}
.batch-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: rgba(74, 158, 255, 0.1);
  border-bottom: 1px solid rgba(74, 158, 255, 0.3);
  gap: 1rem;
}

.selection-info {
  font-weight: 600;
  color: #4a9eff;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.btn-action {
  padding: 0.4rem 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: inherit;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.85rem;
}

.btn-action:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

.btn-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-export {
  background: rgba(46, 204, 113, 0.15);
  border-color: rgba(46, 204, 113, 0.3);
  color: #2ecc71;
}

.btn-export:hover:not(:disabled) {
  background: rgba(46, 204, 113, 0.25);
  border-color: rgba(46, 204, 113, 0.5);
}

.btn-delete {
  background: rgba(231, 76, 60, 0.15);
  border-color: rgba(231, 76, 60, 0.3);
  color: #e74c3c;
}

.btn-delete:hover:not(:disabled) {
  background: rgba(231, 76, 60, 0.25);
  border-color: rgba(231, 76, 60, 0.5);
}
.browser-content {
  flex: 1;
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
  display: flex;
  align-items: center;
  gap: 0.75rem;
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
  flex: 1;
  font-weight: 500;
}

.folder-count {
  font-size: 0.85rem;
  opacity: 0.7;
}

.slice-item-browser {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
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
  display: flex;
  align-items: center;
  justify-content: center;
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
  flex: 1;
  min-width: 0;
}

.slice-grid {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1.5fr 1fr 100px;
  gap: 1rem;
  margin-bottom: 0.5rem;
  align-items: start;
}

.grid-col {
  min-width: 0;
}

.title-col {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
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

.duration-value {
  font-family: 'Courier New', monospace;
  font-weight: 500;
}

.slice-tags-compact {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
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
  display: flex;
  align-items: center;
  justify-content: center;
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
