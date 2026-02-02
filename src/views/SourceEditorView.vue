<template>
  <div class="source-editor-view">
    <PanelHeader title="Source Editor">
      <template #right>
        <div class="d-flex align-items-center gap-2">
          <button
            class="btn btn-sm btn-outline-secondary"
            @click="copyShareLink"
            :title="copied ? 'Copied!' : 'Copy shareable link'"
            aria-label="Copy shareable link"
          >
            <i class="fas fa-link me-1"></i>
            <span>Copy Link</span>
          </button>
        </div>
      </template>
    </PanelHeader>
    <SourceMetadataBar
      v-if="source"
      :title="source.title || source.name"
      :filename="source.name"
      :duration="source.duration"
      :size="source.size"
      :sample-rate="source.sampleRate"
      :number-of-channels="source.numberOfChannels"
      :location="source.location"
      :imported-at="source.importedAt"
      :created-at="source.createdAt"
      @update-title="handleUpdateTitle"
    />

    <div class="editor-layout">
      <div class="main-content">
        <div class="editor-content flex-fill xp-4" v-if="source">
          <!-- Waveform Section -->
          <section class="waveform-section xp-4">
            
            <div class="waveform-container p-0">
              <WaveformViewer 
                :waveformData="source.waveformData"
                :duration="source.duration"
                :width="1200"
                :height="250"
                :slices="sourceSlices"
                :current-time="currentTime"
                :is-playing-region="isPlayingRegion"
                :selected-slice-id="selectedSliceId"
                :waveform-mode="waveformMode"
                @regionSelected="handleRegionSelected"
                @regionUpdated="handleRegionUpdated"
                @regionDragging="handleRegionDragging"
                @regionCleared="clearSelection"
                @playRegion="handlePlayRegion"
                @createSlice="handleCreateSlice"
                @selectSlice="handleSelectSlice"
                @seek="emit('seek', $event)"
                @toggle-waveform-mode="waveformMode = waveformMode === 'line' ? 'bars' : 'line'"
                ref="waveformRef"
              />
            </div>

            <!-- Playback Controls - Positioned directly below waveform -->
            <div class="playback-section mt-3">
              <PlaybackControls
                :isPlaying="isPlaying"
                :currentTime="currentTime"
                :duration="duration"
                :isLoading="isLoading"
                @play="togglePlayPause"
                @pause="togglePlayPause"
                @seek="seek"
              />
            </div>

            <ContextualToolbar
              :mode="toolbarMode"
              :selection="selectedRegion"
              :slice="selectedSlice"
              :is-playing="isPlaying"
              v-model:title="newSliceTitle"
              @play-region="handlePlayRegion"
              @seek-to-slice="handleSeekToSlice"
              @zoom-to-slice="handleZoomToSlice"
              @create-slice="handleCreateSlice"
              @save-slice="handleSaveSliceFromToolbar"
              @delete-slice="handleDeleteSlice"
              @clear-selection="clearSelection"
            />

            <div v-if="selectedRegion || selectedSlice" class="slice-preview-area mt-3">
              <div class="slice-preview-content">
                <SliceWaveformViewer
                  :slice="selectedSliceForWaveform"
                  :source="source"
                  :current-time="currentTime"
                  :is-playing="isPlaying"
                  :waveform-mode="waveformMode"
                  @toggle-waveform-mode="waveformMode = waveformMode === 'line' ? 'bars' : 'line'"
                />
              </div>
            </div>
          </section>
        </div>

        <div v-else class="empty-state text-center py-5 px-3">
          <p class="my-2">Source not found.</p>
        </div>
      </div>

      <SliceSidebar
        :slices="sourceSlices"
        :selected-slice-id="selectedSliceId"
        :is-collapsed="sidebarCollapsed"
        @select-slice="handleSelectSlice"
        @seek-to-slice="handleSeekToSlice"
        @filter-by-artist="handleFilterByArtist"
        @filter-by-type="handleFilterByType"
      />
    </div>

    <!-- Create/Edit Slice Dialog -->
    <CreateSliceDialog
      v-if="showSliceDialog && selectedRegion && source"
      :sourceId="source.id"
      :sourceName="source.name"
      :startTime="selectedRegion.startTime"
      :endTime="selectedRegion.endTime"
      :existingSlice="editingSlice || undefined"
      @create="handleCreateSliceConfirm"
      @update="handleUpdateSlice"
      @cancel="handleCancelSlice"
    />

    <!-- Loading Overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-content d-flex flex-column align-items-center justify-content-center h-100">
        <div class="spinner-border text-primary" role="status" style="width: 4rem; height: 4rem;">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="loading-text">Loading audio file...</p>
      </div>
    </div>

    <!-- Action Bar -->
    <div class="action-bar">
      <button 
        @click="toggleSidebar" 
        class="btn btn-outline-secondary"
        :title="sidebarCollapsed ? 'Show slices' : 'Hide slices'"
      >
        <i :class="sidebarCollapsed ? 'fas fa-chevron-left' : 'fas fa-chevron-right'"></i> Slices 
        <span class="badge bg-primary rounded-pill ms-2">{{ sourceSlices.length }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { Ref } from 'vue'
import type { Source, Slice } from '../types/models'
import WaveformViewer from '../components/WaveformViewer.vue'
import PlaybackControls from '../components/PlaybackControls.vue'
import CreateSliceDialog from '../components/CreateSliceDialog.vue'
import ContextualToolbar from '../components/ContextualToolbar.vue'
import SliceSidebar from '../components/SliceSidebar.vue'
import SliceWaveformViewer from '../components/SliceWaveformViewer.vue'
import SliceEditorForm from '../components/SliceEditorForm.vue'
import SourceMetadataBar from '../components/SourceMetadataBar.vue'
import { formatTime, formatFileSize } from '../utils/helpers'
import PanelHeader from '@/components/PanelHeader.vue'
import { useAppSettings } from '@/composables/useAppSettings'

const router = useRouter()
const route = useRoute()

interface Props {
  id: string
  slices: Slice[]
  currentlyPlayingSliceId: string | null
  isPlaying: boolean
  currentTime: number
  duration: number
  isLoading: boolean
}

const props = defineProps<Props>()

// Inject sources from App.vue
const sources = inject<Ref<Source[]>>('sources')!

// Find the source by ID from route param
const source = computed(() => {
  return sources.value.find(s => s.id === props.id) || null
})

const emit = defineEmits<{
  createSlice: [slice: Omit<Slice, 'id' | 'createdAt' | 'updatedAt'>]
  updateSlice: [slice: Slice]
  deleteSlice: [sliceId: string]
  selectSlice: [slice: Slice]
  playSlice: [slice: Slice]
  togglePlayPause: []
  stop: []
  seek: [time: number]
  updateSource: [source: Source]
  loadAudioFile: [source: Source]
}>()

// Load the audio file when component mounts or source changes
onMounted(() => {
  if (source.value) {
    emit('loadAudioFile', source.value)
  }
})

watch(source, (newSource) => {
  if (newSource) {
    emit('loadAudioFile', newSource)
  }
})

const waveformRef = ref<InstanceType<typeof WaveformViewer> | null>(null)
// Inline metadata editing moved to ContextualToolbar; sidebar removed
// const sliceEditorFormRef = ref<InstanceType<typeof SliceEditorForm> | null>(null)
const showSliceDialog = ref(false)
const selectedRegion = ref<{ startTime: number; endTime: number } | null>(null)
const editingSlice = ref<Slice | null>(null)
const isPlayingRegion = ref(false)
const selectedSliceId = ref<string | null>(null)
const toolbarMode = ref<'region' | 'slice' | null>(null)
const sidebarCollapsed = ref(true)
// Sidebar removed; keep variable for type compatibility if needed
const detailsSidebarCollapsed = ref(true)
const waveformMode = ref<'line' | 'bars'>('bars')
const newSliceTitle = ref('')
const copied = ref(false)
const copyShareLink = async () => {
  try {
    const url = window.location.href
    await navigator.clipboard.writeText(url)
    copied.value = true
    setTimeout(() => copied.value = false, 1500)
  } catch (e) {
    // Fallback: prompt on failure
    window.prompt('Copy link:', window.location.href)
  }
}
// Source title inline edit refs (prevent compile errors)
const editingSourceName = ref(false)
const sourceNameValue = ref('')
const sourceNameInput = ref<HTMLInputElement | null>(null)

// Sidebar width settings and resizing
// Sidebar resize logic removed

// Sync selected slice with query param for shareable URLs
const routeSelectedSliceId = computed(() => {
  const q = route.query as Record<string, unknown>
  const id = typeof q.sliceId === 'string' ? q.sliceId : null
  return id
})

// When route query has sliceId, select that slice if it belongs to this source
const selectSliceByIdFromRoute = (sliceId: string | null) => {
  if (!sliceId) return
  const slice = sourceSlices.value.find(s => s.id === sliceId)
  if (slice) {
    handleSelectSlice(slice)
  }
}

onMounted(() => {
  selectSliceByIdFromRoute(routeSelectedSliceId.value)
})

watch(routeSelectedSliceId, (newId) => {
  // Avoid loop: only update if different from current
  if (newId && newId !== selectedSliceId.value) {
    selectSliceByIdFromRoute(newId)
  }
})

const handleUpdateTitle = (newTitle: string) => {
  if (source.value) {
    emit('updateSource', { ...source.value, title: newTitle })
  }
}

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

const toggleDetailsSidebar = () => {
  detailsSidebarCollapsed.value = !detailsSidebarCollapsed.value
}

const sourceSlices = computed(() => {
  if (!source.value) return []
  return props.slices.filter(s => s.audioFileId === source.value!.id)
})

const formatDuration = (seconds: number) => formatTime(seconds)

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}

const startSourceNameEdit = () => {
  if (!source.value) return
  editingSourceName.value = true
  sourceNameValue.value = source.value.name
  setTimeout(() => {
    if (sourceNameInput.value) {
      sourceNameInput.value.focus()
      sourceNameInput.value.select()
    }
  }, 0)
}

const cancelSourceNameEdit = () => {
  editingSourceName.value = false
  sourceNameValue.value = ''
}

const saveSourceName = () => {
  if (!source.value || !sourceNameValue.value.trim()) {
    cancelSourceNameEdit()
    return
  }

  if (sourceNameValue.value.trim() !== source.value.name) {
    const updatedSource: Source = {
      ...source.value,
      name: sourceNameValue.value.trim(),
    }
    emit('updateSource', updatedSource)
  }
  
  cancelSourceNameEdit()
}

const handleRegionSelected = (region: { startTime: number; endTime: number }) => {
  selectedRegion.value = region
  editingSlice.value = null
  selectedSliceId.value = null
  toolbarMode.value = 'region'
  newSliceTitle.value = ''
}

const handleRegionDragging = (region: { startTime: number; endTime: number }) => {
  // Update selected region for realtime visual feedback only
  selectedRegion.value = region
}

const handleRegionUpdated = (region: { startTime: number; endTime: number }) => {
  selectedRegion.value = region
  
  // If we're editing an existing slice, auto-save the boundary changes
  if (toolbarMode.value === 'slice' && selectedSlice.value) {
    const updatedSlice: Slice = {
      ...selectedSlice.value,
      startTime: region.startTime,
      endTime: region.endTime,
      updatedAt: Date.now(),
    }
    emit('updateSlice', updatedSlice)
  }
}

const handlePlayRegion = () => {
  if (!selectedRegion.value || !source.value) return
  
  // This is a simplified play/pause toggle for the region
  if (isPlayingRegion.value) {
    emit('stop')
    isPlayingRegion.value = false
  } else {
    emit('playSlice', {
      id: 'region-playback', // temporary ID
      audioFileId: source.value.id,
      startTime: selectedRegion.value.startTime,
      endTime: selectedRegion.value.endTime,
      title: 'Selected Region',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    isPlayingRegion.value = true
  }
}

watch(() => props.isPlaying, (newVal) => {
  if (!newVal) {
    isPlayingRegion.value = false
  }
})

const handleSelectSlice = (slice: Slice) => {
  emit('selectSlice', slice)
  selectedSliceId.value = slice.id
  toolbarMode.value = 'slice'
  
  // Also update the region on the waveform
  if (waveformRef.value) {
    selectedRegion.value = { startTime: slice.startTime, endTime: slice.endTime }
    waveformRef.value.setRegion(slice.startTime, slice.endTime)
  }

  // Update query param to reflect selected slice for shareable URL
  const nextQuery = { ...route.query, sliceId: slice.id }
  router.replace({ name: 'source-editor', params: { id: props.id }, query: nextQuery })
}

const selectedSlice = computed(() => {
  if (!selectedSliceId.value) return null
  return sourceSlices.value.find(s => s.id === selectedSliceId.value) || null
})

// Slice with realtime bounds for the waveform viewer during drag
const selectedSliceForWaveform = computed(() => {
  // If we're in region mode (before creating a slice), create a temporary slice for preview
  if (toolbarMode.value === 'region' && selectedRegion.value && source.value) {
    return {
      id: 'temp-preview',
      audioFileId: source.value.id,
      title: newSliceTitle.value || 'New Slice',
      startTime: selectedRegion.value.startTime,
      endTime: selectedRegion.value.endTime,
      folderId: null,
      projectIds: [],
      composer: '',
      performers: [],
      type: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as Slice
  }
  
  if (!selectedSlice.value) return null
  
  // If we're in slice mode and have a region that differs from the slice bounds,
  // return a version with the realtime bounds (during drag)
  if (selectedRegion.value && toolbarMode.value === 'slice') {
    const regionDiffers = 
      selectedRegion.value.startTime !== selectedSlice.value.startTime ||
      selectedRegion.value.endTime !== selectedSlice.value.endTime
    
    if (regionDiffers) {
      return {
        ...selectedSlice.value,
        startTime: selectedRegion.value.startTime,
        endTime: selectedRegion.value.endTime,
      }
    }
  }
  
  return selectedSlice.value
})

const clearSelection = () => {
  selectedRegion.value = null
  selectedSliceId.value = null
  toolbarMode.value = null
  if (waveformRef.value) {
    waveformRef.value.clearRegion()
  }

  // Remove sliceId from query params when clearing selection
  const nextQuery = { ...(route.query as Record<string, any>) }
  delete nextQuery.sliceId
  router.replace({ name: 'source-editor', params: { id: props.id }, query: nextQuery })
}

const handleCreateSlice = async () => {
  if (selectedRegion.value && source.value) {
    // Create slice directly without modal
    const slice: Omit<Slice, 'id' | 'createdAt' | 'updatedAt'> = {
      audioFileId: source.value.id,
      title: newSliceTitle.value.trim() || 'Untitled Slice',
      startTime: selectedRegion.value.startTime,
      endTime: selectedRegion.value.endTime,
      composers: [],
      performers: [],
      type: '',
    }
    
    const newSliceId = await emit('createSlice', slice)
    
    // Clear title and toolbar state
    newSliceTitle.value = ''
    toolbarMode.value = null
    
    // Wait for the slices to update, then select the new slice
    setTimeout(() => {
      const createdSlice = sourceSlices.value.find(s => s.audioFileId === source.value!.id && 
        Math.abs(s.startTime - slice.startTime) < 0.001 && 
        Math.abs(s.endTime - slice.endTime) < 0.001)
      
      if (createdSlice) {
        handleSelectSlice(createdSlice)
      }
    }, 100)
  }
}

const handleCreateSliceConfirm = (slice: Omit<Slice, 'id' | 'createdAt' | 'updatedAt'>) => {
  emit('createSlice', slice)
  showSliceDialog.value = false
  selectedRegion.value = null
  editingSlice.value = null
  
  // Clear the selection on waveform
  if (waveformRef.value) {
    waveformRef.value.clearRegion()
  }
}

const handleUpdateSlice = (slice: Slice) => {
  emit('updateSlice', slice)
  showSliceDialog.value = false
  editingSlice.value = null
}

const handleEditSlice = (slice: Slice) => {
  editingSlice.value = slice
  selectedRegion.value = { startTime: slice.startTime, endTime: slice.endTime }
  showSliceDialog.value = true
}

const handleSaveSliceFromToolbar = (metadata?: { title?: string; type?: string; composers?: string[]; performers?: string[]; tags?: string[]; notes?: string }) => {
  if (!selectedSlice.value) return
  const base = selectedSlice.value
  const updated: Slice = {
    ...base,
    startTime: selectedRegion.value?.startTime ?? base.startTime,
    endTime: selectedRegion.value?.endTime ?? base.endTime,
    title: metadata?.title?.trim() ? metadata.title.trim() : base.title,
    type: metadata?.type || base.type,
    composers: metadata?.composers && metadata.composers.length > 0 ? metadata.composers : base.composers,
    performers: metadata?.performers && metadata.performers.length > 0 ? metadata.performers : base.performers,
    tags: metadata?.tags && metadata.tags.length > 0 ? metadata.tags : base.tags,
    notes: metadata?.notes ?? base.notes,
    updatedAt: Date.now(),
  }
  emit('updateSlice', updated)
}

const handleDeleteSlice = (sliceId: string) => {
  const slice = sourceSlices.value.find(s => s.id === sliceId)
  if (slice && confirm(`Delete slice "${slice.title}"?`)) {
    emit('deleteSlice', slice.id)
  }
}

const handleCancelSlice = () => {
  showSliceDialog.value = false
  selectedRegion.value = null
  editingSlice.value = null
  
  // Clear the selection on waveform
  if (waveformRef.value) {
    waveformRef.value.clearRegion()
  }
}

const handleBack = () => {
  router.back()
}

const handleFilterByArtist = (artistName: string) => {
  router.push({ 
    path: '/slices', 
    query: { artist: artistName } 
  })
}

const handleFilterByType = (type: string) => {
  router.push({ 
    path: '/slices', 
    query: { type: type } 
  })
}

const handleSeekToSlice = (slice: Slice) => {
  // Just seek to the start of the slice
  emit('seek', slice.startTime)
}

const handleZoomToSlice = (slice: Slice) => {
  // Zoom the waveform to fit the slice with padding
  if (waveformRef.value) {
    waveformRef.value.zoomToRange(slice.startTime, slice.endTime, 0.15) // 15% padding on each side
  }
}

const togglePlayPause = () => {
  emit('togglePlayPause')
}

const seek = (time: number) => {
  emit('seek', time)
}
</script>

<style scoped>
.source-editor-view {
  height: 100vh;
  background: #1a1a1a;
}

.editor-layout {
  overflow: hidden;
  padding-bottom: 80px;
}

.main-content {
  overflow-y: auto;
}



.source-title {
  min-width: 0;
}

.source-title h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.source-title h1.editable-title {
  cursor: text;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.source-title h1.editable-title:hover {
  background: rgba(74, 158, 255, 0.1);
}



.metadata-item {
  font-size: 0.75rem;
  color: #888;
}

.metadata-item i {
  opacity: 0.7;
}

.source-info {
  margin: 0.25rem 0 0 0;
  font-size: 0.85rem;
  color: #888;
}

.editor-content {
  overflow: auto;
  width: 100%;
}

.waveform-section,
.slices-section {
  
  border-radius: 8px;
  margin-bottom: 2rem;
}

.section-header {
  margin-bottom: 1.5rem;
}

.section-header h2 {
  margin: 0;
  font-size: 1.3rem;
  color: #fff;
}

.hint {
  font-size: 0.9rem;
  color: #888;
  margin: 0;
}

.waveform-container {
  margin-bottom: 1.5rem;
  background: #1a1a1a;
  border-radius: 4px;
  padding: 1rem;
}

.playback-section {
  margin-top: 1rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #888;
}

.empty-state p {
  color: inherit;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.loading-content {
}

.loading-text {
  color: #fff;
  font-size: 1.25rem;
  margin: 0;
  font-weight: 500;
}

.slice-preview-area {
  position: relative;
  display: flex;
  align-items: stretch;
}

.slice-preview-content {
  flex: 1 1 auto;
  min-width: 0;
}

.details-sidebar {
  flex: 0 0 500px;
  width: 500px;
  
  border-left: 1px solid #333;
  transition: width 0.3s ease, margin-left 0.3s ease;
  position: relative;
  overflow: hidden;
}

.details-sidebar.collapsed {
  flex-basis: 40px;
  width: 40px;
}

.sidebar-resizer {
  flex: 0 0 6px;
  cursor: col-resize;
  background: rgba(255, 255, 255, 0.06);
  border-left: 1px solid #333;
  border-right: 1px solid #333;
}

.sidebar-resizer:hover {
  background: rgba(255, 255, 255, 0.1);
}

.sidebar-toggle-btn {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  background: #2a2a2a;
  border: 1px solid #444;
  border-left: none;
  border-radius: 0 4px 4px 0;
  color: #aaa;
  cursor: pointer;
  z-index: 10;
  transition: background 0.2s;
}

.sidebar-toggle-btn:hover {
  background: #333;
  color: #fff;
}

.details-content {
  overflow-y: auto;
  height: 100%;
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #252525;
  border-top: 1px solid #353535;
  padding: 1rem;
  z-index: 100;
}
</style>
