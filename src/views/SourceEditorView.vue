<template>
  <div class="source-editor-view">
    <header class="view-header">
      <div class="header-content">
        <button class="btn btn-outline-secondary" @click="$emit('back')">
          ← Back
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
          <p class="source-info" v-if="source">
            {{ formatDuration(source.duration) }} • {{ formatFileSize(source.size) }}
          </p>
        </div>
      </div>
    </header>

    <div class="editor-layout">
      <div class="main-content">
        <div class="editor-content" v-if="source">
          <!-- Waveform Section -->
          <section class="waveform-section">
            <div class="section-header">
              <h2>Waveform</h2>
              <p class="hint">Click and drag to select a region</p>
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
                @regionSelected="handleRegionSelected"
                @regionUpdated="handleRegionUpdated"
                @playRegion="handlePlayRegion"
                @createSlice="handleCreateSlice"
                @selectSlice="handleSelectSlice"
                ref="waveformRef"
              />
            </div>

            <ContextualToolbar
              :mode="toolbarMode"
              :selection="selectedRegion"
              :slice="selectedSlice"
              :is-playing="isPlaying"
              @play-region="handlePlayRegion"
              @play-slice="handlePlaySlice"
              @create-slice="handleCreateSlice"
              @update-slice="handleUpdateSlice"
              @delete-slice="handleDeleteSlice"
              @clear-selection="clearSelection"
            />

            <SliceWaveformViewer
              :slice="selectedSlice"
              :source="source"
              :current-time="currentTime"
              :is-playing="isPlaying"
            />

            <!-- Playback Controls -->
            <div class="playback-section">
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
          </section>
        </div>

        <div v-else class="empty-state">
          <p>Source not found.</p>
        </div>
      </div>

      <SliceSidebar
        :slices="sourceSlices"
        :selected-slice-id="selectedSliceId"
        @select-slice="handleSelectSlice"
        @play-slice="handlePlaySlice"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject } from 'vue'
import type { Ref } from 'vue'
import type { Source, Slice } from '../types/models'
import WaveformViewer from '../components/WaveformViewer.vue'
import PlaybackControls from '../components/PlaybackControls.vue'
import CreateSliceDialog from '../components/CreateSliceDialog.vue'
import ContextualToolbar from '../components/ContextualToolbar.vue'
import SliceSidebar from '../components/SliceSidebar.vue'
import SliceWaveformViewer from '../components/SliceWaveformViewer.vue'
import { formatTime, formatFileSize } from '../utils/helpers'

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
}>()

const waveformRef = ref<InstanceType<typeof WaveformViewer> | null>(null)
const showSliceDialog = ref(false)
const selectedRegion = ref<{ startTime: number; endTime: number } | null>(null)
const editingSlice = ref<Slice | null>(null)
const isPlayingRegion = ref(false)
const selectedSliceId = ref<string | null>(null)
const toolbarMode = ref<'region' | 'slice' | null>(null)

const sourceSlices = computed(() => {
  if (!props.source) return []
  return props.slices.filter(s => s.audioFileId === props.source!.id)
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
}

const handleRegionUpdated = (region: { startTime: number; endTime: number }) => {
  selectedRegion.value = region
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

const clearSelection = () => {
  selectedRegion.value = null
  selectedSliceId.value = null
  toolbarMode.value = null
  if (waveformRef.value) {
    waveformRef.value.clearRegion()
  }
}

const handleCreateSlice = () => {
  if (selectedRegion.value) {
    showSliceDialog.value = true
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

const handlePlaySlice = (slice: Slice) => {
  emit('playSlice', slice)
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
  padding: 1rem 2rem;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  max-width: 1400px;
  margin: 0 auto;
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
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.waveform-section,
.slices-section {
  background: #1e1e1e;
  border-radius: 8px;
  padding: 1.5rem;
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
  margin: 0.5rem 0;
}
</style>
