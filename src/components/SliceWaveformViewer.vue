<template>
  <div class="slice-waveform-viewer p-3">
    <div v-if="slice && source" class="waveform-wrapper">
      <div class="waveform-header">
        <h4 class="m-0">{{ slice.title }} Waveform</h4>
        <button @click="emit('toggle-waveform-mode')" class="btn btn-sm btn-outline-secondary" :title="props.waveformMode === 'line' ? 'Switch to bars view' : 'Switch to line view'">
          {{ props.waveformMode === 'line' ? '▬' : '〜' }}
        </button>
      </div>
      <canvas ref="canvasRef" :width="800" :height="100"></canvas>
    </div>
    <div v-else class="empty-state text-center py-4">
      <p>No slice selected</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import type { Slice, Source } from '../types/models'

interface Props {
  slice: Slice | null
  source: Source | null
  currentTime: number
  isPlaying: boolean
  waveformMode?: 'line' | 'bars'
}

const props = withDefaults(defineProps<Props>(), {
  waveformMode: 'line',
})
const canvasRef = ref<HTMLCanvasElement | null>(null)

const emit = defineEmits<{
  'toggle-waveform-mode': []
}>()
const waveformMode = ref<'line' | 'bars'>('line')

const drawWaveform = () => {
  if (!canvasRef.value || !props.slice || !props.source?.waveformData) return

  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { width, height } = canvas
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, width, height)

  const { startTime, endTime } = props.slice
  const { waveformData, duration } = props.source
  
  const startIdx = Math.floor((startTime / duration) * waveformData.length)
  const endIdx = Math.ceil((endTime / duration) * waveformData.length)
  const sliceData = waveformData.slice(startIdx, endIdx)

  const stepX = width / sliceData.length
  const centerY = height / 2
  
  // Detect if data contains signed values (new format) or absolute values (old format)
  let hasNegativeValues = false
  for (let i = 0; i < Math.min(sliceData.length, 100); i++) {
    if (sliceData[i] < 0) {
      hasNegativeValues = true
      break
    }
  }
  
  if (props.waveformMode === 'bars') {
    // Draw as bars (original style)
    ctx.fillStyle = '#4a9eff'
    const barWidth = width / sliceData.length

    for (let i = 0; i < sliceData.length; i++) {
      const amplitude = Math.abs(sliceData[i])
      const barHeight = amplitude * centerY
      const x = i * barWidth
      const y = centerY - barHeight / 2

      ctx.fillRect(x, y, Math.max(1, barWidth), barHeight)
    }
  } else {
    // Draw as line
    ctx.strokeStyle = '#4a9eff'
    ctx.lineWidth = 1.5
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'

    // Draw single continuous waveform line
    ctx.beginPath()
    for (let i = 0; i < sliceData.length; i++) {
      const amplitude = sliceData[i]
      const x = i * stepX
      let y
      
      if (hasNegativeValues) {
        // New format: signed values that oscillate naturally
        y = centerY - (amplitude * centerY * 0.9)
      } else {
        // Old format: absolute values - alternate above/below center for oscillation effect
        const offset = (i % 2 === 0 ? 1 : -1) * amplitude * centerY * 0.9
        y = centerY - offset
      }
      
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()
  }

  // Draw playhead (show whenever currentTime is within slice range)
  if (props.currentTime >= startTime && props.currentTime <= endTime) {
    const relativeTime = props.currentTime - startTime
    const sliceDuration = endTime - startTime
    const playheadX = (relativeTime / sliceDuration) * width
    
    ctx.strokeStyle = '#ff6b6b'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(playheadX, 0)
    ctx.lineTo(playheadX, height)
    ctx.stroke()
  }
}

watch(() => [props.slice, props.currentTime, props.isPlaying, props.waveformMode], () => {
  drawWaveform()
}, { deep: true, immediate: true })

onMounted(drawWaveform)
</script>

<style scoped>
.slice-waveform-viewer {
  padding: 1rem;
  background: #1e1e1e;
  border-top: 1px solid #333;
}
.waveform-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.waveform-wrapper h4 {
  margin: 0;
  font-size: 1rem;
  color: #ccc;
}
canvas {
  display: block;
  width: 100%;
  border-radius: 4px;
}
.empty-state {
  text-align: center;
  color: #888;
  padding: 2rem 0;
}
</style>