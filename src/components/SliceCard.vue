<template>
  <div
    class="slice-card"
    :class="{ 
      'is-playing': isThisSlicePlaying,
      'is-selected': isSelected 
    }"
    @click="emit('selectSlice', slice)"
  >
    <button 
      class="btn btn-primary rounded-circle p-0"
      style="width: 40px; height: 40px;"
      @click.stop="handlePlayPauseClick"
    >
      {{ isThisSlicePlaying ? '⏸' : '▶' }}
    </button>
    <div class="slice-content">
      <div class="slice-info" @click="emit('selectSlice', slice)">
        <div class="slice-title-row">
          <input
            v-if="editingTitleId === slice.id"
            v-model="editingTitleValue"
            @blur="saveTitle"
            @keyup.enter="saveTitle"
            @keyup.esc="cancelTitleEdit"
            @click.stop
            class="form-control form-control-sm"
            ref="titleInput"
          />
          <h3 
            v-else
            class="slice-title"
            @dblclick.stop="startTitleEdit"
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
          :ref="el => setSliceCanvas(el as HTMLCanvasElement)"
          :width="300"
          :height="60"
          class="mini-waveform"
        ></canvas>
      </div>
    </div>
    <div class="slice-actions">
      <button 
        class="btn btn-sm btn-outline-primary"
        @click.stop="emit('editSlice', slice)"
        title="Edit slice"
      >
        ✎
      </button>
      <button 
        class="btn btn-sm btn-outline-danger"
        @click.stop="emit('deleteSlice', slice.id)"
        title="Delete slice"
      >
        🗑
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import type { Slice, Source } from '../types/models'
import { formatTime } from '../utils/helpers'

interface Props {
  slice: Slice
  source: Source | null
  isPlaying: boolean
  currentlyPlayingSliceId: string | null
  currentTime: number
  isSelected: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  playSlice: [slice: Slice]
  togglePlayPause: []
  selectSlice: [slice: Slice]
  editSlice: [slice: Slice]
  deleteSlice: [sliceId: string]
  updateSlice: [slice: Slice]
}>()

const editingTitleId = ref<string | null>(null)
const editingTitleValue = ref('')
const titleInput = ref<HTMLInputElement | null>(null)
const sliceCanvas = ref<HTMLCanvasElement | null>(null)

const isThisSlicePlaying = computed(() => {
  return props.currentlyPlayingSliceId === props.slice.id && props.isPlaying
})

const handlePlayPauseClick = () => {
  if (isThisSlicePlaying.value) {
    emit('togglePlayPause')
  } else {
    emit('playSlice', props.slice)
  }
}

const formatDuration = (seconds: number) => formatTime(seconds)

const startTitleEdit = () => {
  editingTitleId.value = props.slice.id
  editingTitleValue.value = props.slice.title
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

const saveTitle = () => {
  if (!editingTitleValue.value.trim()) {
    cancelTitleEdit()
    return
  }

  if (editingTitleValue.value.trim() !== props.slice.title) {
    const updatedSlice: Slice = {
      ...props.slice,
      title: editingTitleValue.value.trim(),
      updatedAt: Date.now(),
    }
    emit('updateSlice', updatedSlice)
  }
  
  cancelTitleEdit()
}

const setSliceCanvas = (canvas: HTMLCanvasElement | null) => {
  if (canvas) {
    sliceCanvas.value = canvas
  }
}

const drawSliceWaveform = () => {
  if (!sliceCanvas.value || !props.source?.waveformData || !props.source.duration) return

  const ctx = sliceCanvas.value.getContext('2d')
  if (!ctx) return

  const width = sliceCanvas.value.width
  const height = sliceCanvas.value.height

  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, width, height)

  const fullData = props.source.waveformData
  const startRatio = props.slice.startTime / props.source.duration
  const endRatio = props.slice.endTime / props.source.duration
  
  const startIdx = Math.floor(startRatio * fullData.length)
  const endIdx = Math.ceil(endRatio * fullData.length)
  const sliceData = fullData.slice(startIdx, endIdx)

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

  // Draw playhead
  if (isThisSlicePlaying.value) {
    const sliceDuration = props.slice.endTime - props.slice.startTime
    const relativeTime = props.currentTime - props.slice.startTime
    if (relativeTime >= 0 && relativeTime <= sliceDuration) {
      const playheadX = (relativeTime / sliceDuration) * width
      ctx.strokeStyle = '#ff6b6b'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(playheadX, 0)
      ctx.lineTo(playheadX, height)
      ctx.stroke()
    }
  }
}

watch(() => [props.source?.waveformData, props.slice, props.currentTime, props.isPlaying], () => {
  setTimeout(() => {
    drawSliceWaveform()
  }, 50)
}, { deep: true })

onMounted(() => {
  setTimeout(() => {
    drawSliceWaveform()
  }, 50)
})
</script>

<style scoped>
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

.slice-card.is-selected {
  background: #3a4a5a;
  border-color: #4a9eff;
}

.slice-card.is-playing {
  background: #2d3e50;
  border-left: 3px solid #4a9eff;
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


</style>