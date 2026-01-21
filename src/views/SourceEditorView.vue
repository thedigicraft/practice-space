<template>
  <div class="source-editor-view">
    <header class="view-header">
      <div class="header-content">
        <button class="btn-back" @click="$emit('back')">
          ← Back
        </button>
        <div class="source-title">
          <input
            v-if="editingSourceName"
            v-model="sourceNameValue"
            @blur="saveSourceName"
            @keyup.enter="saveSourceName"
            @keyup.esc="cancelSourceNameEdit"
            class="source-name-input"
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
            @regionSelected="handleRegionSelected"
            ref="waveformRef"
          />
        </div>

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

      <!-- Slices Section -->
      <section class="slices-section">
        <div class="section-header">
          <h2>Slices from this source ({{ sourceSlices.length }})</h2>
        </div>
        
        <div v-if="sourceSlices.length === 0" class="empty-state">
          <p>No slices created yet.</p>
          <p class="hint">Select a region on the waveform to create your first slice!</p>
        </div>

        <div v-else class="slices-list">
          <div
            v-for="slice in sourceSlices"
            :key="slice.id"
            class="slice-card"
            :class="{ 'is-playing': currentlyPlayingSliceId === slice.id && isPlaying }"
          >
            <button 
              class="play-btn"
              @click="handlePlaySlice(slice)"
            >
              {{ currentlyPlayingSliceId === slice.id && isPlaying ? '⏸' : '▶' }}
            </button>
            <div class="slice-content">
              <div class="slice-info" @click="handleSelectSlice(slice)">
                <div class="slice-title-row">
                  <input
                    v-if="editingTitleId === slice.id"
                    v-model="editingTitleValue"
                    @blur="saveTitle(slice)"
                    @keyup.enter="saveTitle(slice)"
                    @keyup.esc="cancelTitleEdit"
                    @click.stop
                    class="title-input"
                    ref="titleInput"
                  />
                  <h3 
                    v-else
                    class="slice-title"
                    @dblclick.stop="startTitleEdit(slice)"
                    :title="'Double-click to edit'"
                  >
                    {{ slice.title }}
                  </h3>
                </div>
                <p class="slice-time">
                  {{ formatTime(slice.startTime) }} - {{ formatTime(slice.endTime) }}
                  <span class="slice-duration">({{ formatDuration(slice.endTime - slice.startTime) }})</span>
                </p>
                <p v-if="slice.notes" class="slice-notes">{{ slice.notes }}</p>
                <div v-if="slice.tags && slice.tags.length > 0" class="slice-tags">
                  <span v-for="tag in slice.tags" :key="tag" class="tag">{{ tag }}</span>
                </div>
              </div>
              <div class="slice-waveform" v-if="source?.waveformData">
                <canvas 
                  :ref="el => setSliceCanvas(slice.id, el as HTMLCanvasElement)"
                  :width="300"
                  :height="60"
                  class="mini-waveform"
                ></canvas>
              </div>
            </div>
            <div class="slice-actions">
              <button 
                class="btn-edit"
                @click="handleEditSlice(slice)"
                title="Edit slice"
              >
                ✎
              </button>
              <button 
                class="btn-delete"
                @click="handleDeleteSlice(slice)"
                title="Delete slice"
              >
                🗑
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div v-else class="empty-state">
      <p>Source not found.</p>
    </div>

    <!-- Create/Edit Slice Dialog -->
    <CreateSliceDialog
      v-if="showSliceDialog && selectedRegion && source"
      :sourceId="source.id"
      :sourceName="source.name"
      :startTime="selectedRegion.startTime"
      :endTime="selectedRegion.endTime"
      :existingSlice="editingSlice || undefined"
      @create="handleCreateSlice"
      @update="handleUpdateSlice"
      @cancel="handleCancelSlice"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Source, Slice } from '../types/models'
import WaveformViewer from '../components/WaveformViewer.vue'
import PlaybackControls from '../components/PlaybackControls.vue'
import CreateSliceDialog from '../components/CreateSliceDialog.vue'
import { formatTime, formatFileSize } from '../utils/helpers'

interface Props {
  source: Source | null
  slices: Slice[]
  currentlyPlayingSliceId: string | null
  isPlaying: boolean
  currentTime: number
  duration: number
  isLoading: boolean
}

const props = defineProps<Props>()

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
const sliceCanvases = ref<Map<string, HTMLCanvasElement>>(new Map())
const editingTitleId = ref<string | null>(null)
const editingTitleValue = ref('')
const titleInput = ref<HTMLInputElement | null>(null)
const editingSourceName = ref(false)
const sourceNameValue = ref('')
const sourceNameInput = ref<HTMLInputElement | null>(null)

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

const startTitleEdit = (slice: Slice) => {
  editingTitleId.value = slice.id
  editingTitleValue.value = slice.title
  // Focus input on next tick
  setTimeout(() => {
    if (titleInput.value) {
      titleInput.value.focus()
      titleInput.value.select()
    }
  }, 0)
}

const cancelTitleEdit = () => {
  editingTitleId.value = null
  editingTitleValue.value = ''
}

const saveTitle = (slice: Slice) => {
  if (!editingTitleValue.value.trim()) {
    cancelTitleEdit()
    return
  }

  if (editingTitleValue.value.trim() !== slice.title) {
    const updatedSlice: Slice = {
      ...slice,
      title: editingTitleValue.value.trim(),
      updatedAt: Date.now(),
    }
    emit('updateSlice', updatedSlice)
  }
  
  cancelTitleEdit()
}

const setSliceCanvas = (sliceId: string, canvas: HTMLCanvasElement | null) => {
  if (canvas) {
    sliceCanvases.value.set(sliceId, canvas)
  }
}

const drawSliceWaveform = (canvas: HTMLCanvasElement, slice: Slice) => {
  if (!props.source?.waveformData || !props.source.duration) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = canvas.width
  const height = canvas.height

  // Clear canvas
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, width, height)

  // Calculate which portion of the waveform to display
  const fullData = props.source.waveformData
  const startRatio = slice.startTime / props.source.duration
  const endRatio = slice.endTime / props.source.duration
  
  const startIdx = Math.floor(startRatio * fullData.length)
  const endIdx = Math.ceil(endRatio * fullData.length)
  const sliceData = fullData.slice(startIdx, endIdx)

  // Draw waveform
  const barWidth = width / sliceData.length
  const centerY = height / 2

  ctx.fillStyle = '#4a9eff'

  for (let i = 0; i < sliceData.length; i++) {
    const amplitude = sliceData[i]
    const barHeight = amplitude * centerY
    const x = i * barWidth
    const y = centerY - barHeight / 2

    ctx.fillRect(x, y, Math.max(1, barWidth), barHeight)
  }
}

// Draw waveforms when slices or source data changes
watch([() => props.source?.waveformData, sourceSlices], () => {
  if (!props.source?.waveformData) return
  
  // Use setTimeout to ensure canvases are rendered
  setTimeout(() => {
    sourceSlices.value.forEach(slice => {
      const canvas = sliceCanvases.value.get(slice.id)
      if (canvas) {
        drawSliceWaveform(canvas, slice)
      }
    })
  }, 50)
}, { immediate: true })

const handleRegionSelected = (region: { startTime: number; endTime: number }) => {
  selectedRegion.value = region
  editingSlice.value = null
  showSliceDialog.value = true
}

const handleCreateSlice = (slice: Omit<Slice, 'id' | 'createdAt' | 'updatedAt'>) => {
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

const handleDeleteSlice = (slice: Slice) => {
  if (confirm(`Delete slice "${slice.title}"?`)) {
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

const handleSelectSlice = (slice: Slice) => {
  emit('selectSlice', slice)
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

.btn-back {
  background: #2a2a2a;
  color: #fff;
  border: 1px solid #444;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-back:hover {
  background: #333;
  border-color: #555;
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

.source-name-input {
  width: 100%;
  background: #1a1a1a;
  border: 2px solid #4a9eff;
  color: #fff;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 1.5rem;
  font-weight: bold;
  font-family: inherit;
  outline: none;
  margin: 0;
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

/* Slices List */
.slices-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.slice-card {
  background: #2a2a2a;
  border-radius: 6px;
  padding: 1rem;
  display: flex;
  gap: 1rem;
  align-items: stretch;
  transition: all 0.2s;
}

.slice-card:hover {
  background: #333;
}

.slice-card.is-playing {
  background: #2d3e50;
  border-left: 3px solid #4a9eff;
}

.play-btn {
  background: #4a9eff;
  color: white;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
  align-self: flex-start;
}

.play-btn:hover {
  background: #357abd;
  transform: scale(1.05);
}

.slice-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.slice-info {
  cursor: pointer;
}

.slice-title-row {
  margin-bottom: 0.5rem;
}

.slice-title {
  margin: 0;
  font-size: 1rem;
  color: #fff;
  cursor: text;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.slice-title:hover {
  background: rgba(74, 158, 255, 0.1);
}

.title-input {
  width: 100%;
  background: #1a1a1a;
  border: 2px solid #4a9eff;
  color: #fff;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;
  outline: none;
}

.slice-time {
  margin: 0 0 0.5rem 0;
  font-size: 0.85rem;
  color: #888;
}

.slice-duration {
  color: #666;
  margin-left: 0.5rem;
}

.slice-notes {
  margin: 0.5rem 0;
  font-size: 0.9rem;
  color: #aaa;
  font-style: italic;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  border-left: 3px solid #4a9eff;
}

.slice-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  background: #333;
  color: #4a9eff;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
}

.slice-waveform {
  background: #1a1a1a;
  border-radius: 4px;
  padding: 0.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

.mini-waveform {
  display: block;
  border-radius: 2px;
}

.slice-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-edit {
  background: #2a2a2a;
  color: #4a9eff;
  border: 1px solid #444;
  width: 36px;
  height: 36px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}

.btn-edit:hover {
  background: #333;
  border-color: #4a9eff;
  color: #fff;
}

.btn-delete {
  background: #2a2a2a;
  color: #ff6b6b;
  border: 1px solid #444;
  width: 36px;
  height: 36px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}

.btn-delete:hover {
  background: #ff6b6b;
  border-color: #ff6b6b;
  color: #fff;
}
</style>
