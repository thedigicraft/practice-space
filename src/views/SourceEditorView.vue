<template>
  <div class="source-editor-view">
    <header class="view-header">
      <div class="header-content px-4 py-3">
        <button class="btn btn-outline-secondary" @click="handleBack">
          <i class="fas fa-arrow-left"></i> Back
        </button>
        <div class="source-title">
          <input
            v-if="editingSourceName"
            v-model="sourceNameValue"
            @blur="saveSourceName"
            @keyup.enter="saveSourceName"
            @keyup.esc="cancelSourceNameEdit"
            class="form-control"
            ref="sourceNameInput"
          />
          <h1 
            v-else
            @dblclick="startSourceNameEdit"
            :title="'Double-click to edit'"
            class="editable-title"
          >
            {{ source?.name || 'Source Editor' }}
          </h1>
          <p class="source-info mt-1" v-if="source">
            {{ formatDuration(source.duration) }} • {{ formatFileSize(source.size) }}
          </p>
        </div>
        <button 
          @click="toggleSidebar" 
          class="btn btn-outline-secondary"
          :title="sidebarCollapsed ? 'Show slices' : 'Hide slices'"
        >
          <i :class="sidebarCollapsed ? 'fas fa-chevron-left' : 'fas fa-chevron-right'"></i> Slices ({{ sourceSlices.length }})
        </button>
      </div>
    </header>

    <div class="editor-layout">
      <div class="main-content">
        <div class="editor-content p-4" v-if="source">
          <!-- Waveform Section -->
          <section class="waveform-section p-4">
            <div class="section-header">
              <h2 class="m-0">Waveform</h2>
              <p class="hint m-0">Click and drag to select a region</p>
            </div>
            
            <div class="waveform-container">
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
                @pause="$emit('stop')"
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

            <div v-if="selectedRegion || selectedSlice" class="slice-preview-area mt-">
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

              <div v-if="selectedSlice" :class="['details-sidebar', { collapsed: detailsSidebarCollapsed }]">
                <button @click="toggleDetailsSidebar" class="sidebar-toggle-btn py-4 px-2">
                  <i :class="detailsSidebarCollapsed ? 'fas fa-chevron-left' : 'fas fa-chevron-right'"></i>
                </button>
                <div v-if="!detailsSidebarCollapsed" class="details-content px-4">
                  <SliceEditorForm
                    :slice="selectedSlice"
                    :selection="selectedRegion"
                    :hide-save-button="true"
                    @update="handleUpdateSlice"
                    @cancel="clearSelection"
                    ref="sliceEditorFormRef"
                  />
                </div>
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
      <div class="loading-content">
        <div class="spinner-border text-primary" role="status" style="width: 4rem; height: 4rem;">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="loading-text">Loading audio file...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { Ref } from 'vue'
import type { Source, Slice } from '../types/models'
import WaveformViewer from '../components/WaveformViewer.vue'
import PlaybackControls from '../components/PlaybackControls.vue'
import CreateSliceDialog from '../components/CreateSliceDialog.vue'
import ContextualToolbar from '../components/ContextualToolbar.vue'
import SliceSidebar from '../components/SliceSidebar.vue'
import SliceWaveformViewer from '../components/SliceWaveformViewer.vue'
import SliceEditorForm from '../components/SliceEditorForm.vue'
import { formatTime, formatFileSize } from '../utils/helpers'

const router = useRouter()

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
  back: []
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
const sliceEditorFormRef = ref<InstanceType<typeof SliceEditorForm> | null>(null)
const showSliceDialog = ref(false)
const selectedRegion = ref<{ startTime: number; endTime: number } | null>(null)
const editingSlice = ref<Slice | null>(null)
const isPlayingRegion = ref(false)
const selectedSliceId = ref<string | null>(null)
const toolbarMode = ref<'region' | 'slice' | null>(null)
const sidebarCollapsed = ref(true)
const detailsSidebarCollapsed = ref(false)
const waveformMode = ref<'line' | 'bars'>('bars')
const newSliceTitle = ref('')

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

const startSourceNameEdit = () => {
  if (!props.source) return
  editingSourceName.value = true
  sourceNameValue.value = props.source.name
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
  if (!props.source || !sourceNameValue.value.trim()) {
    cancelSourceNameEdit()
    return
  }

  if (sourceNameValue.value.trim() !== props.source.name) {
    const updatedSource: Source = {
      ...props.source,
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
  if (!selectedRegion.value || !props.source) return
  
  // This is a simplified play/pause toggle for the region
  if (isPlayingRegion.value) {
    emit('stop')
    isPlayingRegion.value = false
  } else {
    emit('playSlice', {
      id: 'region-playback', // temporary ID
      audioFileId: props.source.id,
      startTime: selectedRegion.value.startTime,
      endTime: selectedRegion.value.endTime,
      title: 'Selected Region',
      inPoint: selectedRegion.value.startTime,
      outPoint: selectedRegion.value.endTime,
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
}

const handleCreateSlice = async () => {
  if (selectedRegion.value && source.value) {
    // Create slice directly without modal
    const slice: Omit<Slice, 'id' | 'createdAt' | 'updatedAt'> = {
      audioFileId: source.value.id,
      title: newSliceTitle.value.trim() || 'Untitled Slice',
      startTime: selectedRegion.value.startTime,
      endTime: selectedRegion.value.endTime,
      folderId: null,
      projectIds: [],
      composer: '',
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

const handleSaveSliceFromToolbar = () => {
  if (sliceEditorFormRef.value) {
    sliceEditorFormRef.value.triggerSave()
  }
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
  emit('back')
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
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
}

.editor-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow-y: auto;
}

.view-header {
  background: #1e1e1e;
  border-bottom: 1px solid #333;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}



.source-title {
  flex: 1;
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



.source-info {
  margin: 0.25rem 0 0 0;
  font-size: 0.85rem;
  color: #888;
}

.editor-content {
  flex: 1;
  overflow: auto;
  width: 100%;
}

.waveform-section,
.slices-section {
  background: #1e1e1e;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  display: flex;
  justify-content: center;
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
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.loading-text {
  color: #fff;
  font-size: 1.25rem;
  margin: 0;
  font-weight: 500;
}

.slice-preview-area {
  display: flex;
  gap: 0;
  position: relative;
}

.slice-preview-content {
  flex: 1;
  min-width: 0;
}

.details-sidebar {
  width: 500px;
  background: #1e1e1e;
  border-left: 1px solid #333;
  transition: width 0.3s ease, margin-left 0.3s ease;
  position: relative;
  overflow: hidden;
}

.details-sidebar.collapsed {
  width: 40px;
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
</style>
