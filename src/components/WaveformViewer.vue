<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import type { Slice } from '../types/models'

interface Props {
  waveformData?: Float32Array
  width?: number
  height?: number
  color?: string
  backgroundColor?: string
  duration?: number // Duration in seconds for time display
  slices?: Slice[] // Existing slices to display as highlights
  currentTime?: number // Current playback time in seconds
  isPlayingRegion: boolean
  selectedSliceId?: string | null // ID of currently selected slice being edited
  waveformMode?: 'line' | 'bars'
  showControls?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  width: 800,
  height: 200,
  color: '#4a9eff',
  backgroundColor: '#1a1a1a',
  duration: 0,
  waveformMode: 'line',
  showControls: true,
})

interface Region {
  start: number // Normalized 0-1
  end: number   // Normalized 0-1
}

const emit = defineEmits<{
  regionSelected: [region: { startTime: number; endTime: number }]
  regionUpdated: [region: { startTime: number; endTime: number }]
  regionDragging: [region: { startTime: number; endTime: number }]
  regionCleared: []
  playRegion: [region: { startTime: number; endTime: number }]
  createSlice: []
  selectSlice: [slice: Slice]
  seek: [time: number]
  'toggle-waveform-mode': []
  zoomChanged: [zoom: number]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

// Zoom and pan state
const zoomLevel = ref(1) // 1 = no zoom, 2 = 2x zoom, etc.
const panOffset = ref(0) // 0-1, normalized offset

// Region selection state
const isDragging = ref(false)
const region = ref<Region | null>(null)
const currentRegion = ref<Region | null>(null)
const handleBeingDragged = ref<'start' | 'end' | null>(null)
const isDraggingRegion = ref(false)
const isDraggingPlayhead = ref(false)
const playheadDragPosition = ref<number | null>(null) // Normalized 0-1 position during drag
const dragStartPosition = ref(0)
const cursorStyle = ref('default')

// Compute visible range based on zoom and pan
const visibleRange = computed(() => {
  const visibleWidth = 1 / zoomLevel.value
  const maxOffset = 1 - visibleWidth
  const clampedOffset = Math.max(0, Math.min(panOffset.value, maxOffset))
  return {
    start: clampedOffset,
    end: clampedOffset + visibleWidth
  }
})

// Compute playhead position as percentage for the handle
const playheadPosition = computed(() => {
  if (props.currentTime === undefined || props.duration <= 0) {
    return null
  }
  
  // Use drag position if actively dragging, otherwise use currentTime
  const normalizedTime = isDraggingPlayhead.value && playheadDragPosition.value !== null
    ? playheadDragPosition.value
    : props.currentTime / props.duration
  
  const range = visibleRange.value
  const playheadInView = (normalizedTime - range.start) / (range.end - range.start)
  
  // Only show if within visible range
  if (playheadInView >= 0 && playheadInView <= 1) {
    return `${playheadInView * 100}%`
  }
  
  return null
})

// Draw the waveform
const drawWaveform = () => {
  if (!canvasRef.value || !props.waveformData) return

  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Set canvas size
  canvas.width = props.width
  canvas.height = props.height

  // Clear canvas
  ctx.fillStyle = props.backgroundColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Get visible data range
  const range = visibleRange.value
  const dataLength = props.waveformData.length
  const startIdx = Math.floor(range.start * dataLength)
  const endIdx = Math.ceil(range.end * dataLength)
  const visibleData = props.waveformData.slice(startIdx, endIdx)

  // Draw waveform for visible range
  const width = canvas.width
  const height = canvas.height
  const stepX = width / visibleData.length
  const centerY = height / 2

  // Detect if data contains signed values (new format) or absolute values (old format)
  // If all values are >= 0, it's old format (absolute)
  let hasNegativeValues = false
  for (let i = 0; i < Math.min(visibleData.length, 100); i++) {
    if (visibleData[i] < 0) {
      hasNegativeValues = true
      break
    }
  }

  if (props.waveformMode === 'bars') {
    // Draw as bars (original style)
    ctx.fillStyle = props.color
    const barWidth = width / visibleData.length

    for (let i = 0; i < visibleData.length; i++) {
      const amplitude = Math.abs(visibleData[i])
      const barHeight = amplitude * centerY
      const x = i * barWidth
      const y = centerY - barHeight / 2

      ctx.fillRect(x, y, Math.max(1, barWidth), barHeight)
    }
  } else {
    // Draw as line
    ctx.strokeStyle = props.color
    ctx.lineWidth = 1.5
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'

    // Draw single continuous waveform line
    ctx.beginPath()
    for (let i = 0; i < visibleData.length; i++) {
      const amplitude = visibleData[i]
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

  // Draw existing slices as highlights (on top of waveform)
  if (props.slices && props.slices.length > 0 && props.duration > 0) {
    props.slices.forEach(slice => {
      // Skip drawing this slice if it's currently selected/being edited
      // The blue selection region will be drawn instead
      if (props.selectedSliceId && slice.id === props.selectedSliceId) {
        return
      }
      // Convert slice times to normalized positions (0-1)
      const sliceStart = slice.startTime / props.duration
      const sliceEnd = slice.endTime / props.duration
      
      // Convert to visible canvas coordinates
      const range = visibleRange.value
      const sliceStartInView = (sliceStart - range.start) / (range.end - range.start)
      const sliceEndInView = (sliceEnd - range.start) / (range.end - range.start)
      
      // Only draw if slice is visible in current view
      if (sliceEndInView >= 0 && sliceStartInView <= 1) {
        const startX = Math.max(0, sliceStartInView * width)
        const endX = Math.min(width, sliceEndInView * width)
        const regionWidth = endX - startX

        const isSelected = slice.id === props.selectedSliceId

        // Draw more visible green overlay for saved slices
        ctx.fillStyle = isSelected ? 'rgba(74, 158, 255, 0.4)' : 'rgba(46, 204, 113, 0.3)'
        ctx.fillRect(startX, 0, regionWidth, height)

        // Draw border around entire slice box
        ctx.strokeStyle = isSelected ? '#4a9eff' : '#2ecc71'
        ctx.lineWidth = 1
        ctx.strokeRect(startX, 0, regionWidth, height)

        // Draw label badge at top left - always show for better visibility
        if (regionWidth > 30) { // Only show label if there's enough space
          const labelPadding = 6
          const labelHeight = 20
          const maxLabelWidth = Math.min(regionWidth - 8, 150)
          
          // Measure text
          ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          ctx.textBaseline = 'top'
          let labelText = slice.title
          let textWidth = ctx.measureText(labelText).width
          
          // Truncate text if needed
          if (textWidth > maxLabelWidth - labelPadding * 2) {
            while (textWidth > maxLabelWidth - labelPadding * 2 - 10 && labelText.length > 0) {
              labelText = labelText.slice(0, -1)
              textWidth = ctx.measureText(labelText + '...').width
            }
            labelText += '...'
          }
          
          const labelWidth = Math.min(textWidth + labelPadding * 2, maxLabelWidth)
          
          // Draw badge background - black for better contrast
          ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
          ctx.fillRect(startX + 4, 4, labelWidth, labelHeight)
          
          // Draw badge text
          ctx.fillStyle = '#ffffff'
          ctx.fillText(labelText, startX + 4 + labelPadding, 4 + (labelHeight - 11) / 2 + 1)
        }
      }
    })
  }

  // Draw region overlay
  const activeRegion = currentRegion.value || region.value
  if (activeRegion) {
    // Convert region position from full waveform to visible canvas
    const range = visibleRange.value
    const regionStartInView = (activeRegion.start - range.start) / (range.end - range.start)
    const regionEndInView = (activeRegion.end - range.start) / (range.end - range.start)
    
    // Only draw if region is visible
    if (regionEndInView >= 0 && regionStartInView <= 1) {
      const startX = Math.max(0, regionStartInView * width)
      const endX = Math.min(width, regionEndInView * width)
      const regionWidth = endX - startX

      // Semi-transparent overlay
      ctx.fillStyle = 'rgba(74, 158, 255, 0.2)'
      ctx.fillRect(startX, 0, regionWidth, height)

      // Region border around entire box
      ctx.strokeStyle = '#4a9eff'
      ctx.lineWidth = 1
      ctx.strokeRect(startX, 0, regionWidth, height)

      // Draggable handles
      ctx.fillStyle = '#4a9eff'
      ctx.fillRect(startX - 4, 0, 8, height)
      ctx.fillRect(endX - 4, 0, 8, height)
    }
  }

  // Draw playhead line (handle is separate HTML element)
  if (props.currentTime !== undefined && props.duration > 0) {
    const normalizedTime = props.currentTime / props.duration
    const range = visibleRange.value
    const playheadInView = (normalizedTime - range.start) / (range.end - range.start)

    if (playheadInView >= 0 && playheadInView <= 1) {
      const x = playheadInView * width
      
      // Draw vertical line only
      ctx.strokeStyle = '#ff6b6b'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
  }
}

// Mouse event handlers
const handlePlayheadHandleMouseDown = (e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  isDraggingPlayhead.value = true
  
  // Add window listeners for smooth dragging
  const handleWindowMouseMove = (e: MouseEvent) => {
    if (!canvasRef.value || !isDraggingPlayhead.value) return
    
    const rect = canvasRef.value.getBoundingClientRect()
    const x = e.clientX - rect.left
    const canvasX = Math.max(0, Math.min(1, x / rect.width))
    const range = visibleRange.value
    const normalizedX = range.start + (canvasX * (range.end - range.start))
    
    playheadDragPosition.value = normalizedX
    const newTime = normalizedX * props.duration
    emit('seek', Math.max(0, Math.min(props.duration, newTime)))
  }
  
  const handleWindowMouseUp = () => {
    isDraggingPlayhead.value = false
    playheadDragPosition.value = null
    window.removeEventListener('mousemove', handleWindowMouseMove)
    window.removeEventListener('mouseup', handleWindowMouseUp)
  }
  
  window.addEventListener('mousemove', handleWindowMouseMove)
  window.addEventListener('mouseup', handleWindowMouseUp)
}

const handleDoubleClick = (e: MouseEvent) => {
  if (!canvasRef.value) return

  const rect = canvasRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const canvasX = Math.max(0, Math.min(1, x / rect.width))
  
  // Convert canvas position to actual waveform position accounting for zoom/pan
  const range = visibleRange.value
  const normalizedX = range.start + (canvasX * (range.end - range.start))

  // Check if double-clicking on a slice
  if (props.slices && props.duration > 0) {
    for (const slice of props.slices) {
      const sliceStart = slice.startTime / props.duration
      const sliceEnd = slice.endTime / props.duration
      if (normalizedX >= sliceStart && normalizedX <= sliceEnd) {
        // Zoom to this slice
        zoomToRange(slice.startTime, slice.endTime, 0.15)
        return
      }
    }
  }
}

const handleMouseDown = (e: MouseEvent) => {
  if (!canvasRef.value) return

  const rect = canvasRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const canvasX = Math.max(0, Math.min(1, x / rect.width))
  
  // Convert canvas position to actual waveform position accounting for zoom/pan
  const range = visibleRange.value
  const normalizedX = range.start + (canvasX * (range.end - range.start))

  // Check if clicking on a handle
  if (region.value) {
    const handleWidth = 8 / props.width // 8px handle width
    const startHandlePos = (region.value.start - range.start) / (range.end - range.start)
    const endHandlePos = (region.value.end - range.start) / (range.end - range.start)
    if (Math.abs(canvasX - startHandlePos) * props.width < 8) {
      handleBeingDragged.value = 'start'
      isDragging.value = true
      return
    }
    if (Math.abs(canvasX - endHandlePos) * props.width < 8) {
      handleBeingDragged.value = 'end'
      isDragging.value = true
      return
    }
    // Check if clicking inside the region to drag entire box
    if (normalizedX >= region.value.start && normalizedX <= region.value.end) {
      isDraggingRegion.value = true
      isDragging.value = true
      dragStartPosition.value = normalizedX
      return
    }
  }

  // Check if clicking on a slice
  if (props.slices && props.duration > 0) {
    for (const slice of props.slices) {
      const sliceStart = slice.startTime / props.duration
      const sliceEnd = slice.endTime / props.duration
      if (normalizedX >= sliceStart && normalizedX <= sliceEnd) {
        emit('selectSlice', slice)
        return
      }
    }
  }

  isDragging.value = true
  currentRegion.value = {
    start: normalizedX,
    end: normalizedX,
  }
  drawWaveform()
}

const handleMouseMove = (e: MouseEvent) => {
  if (!canvasRef.value) return

  const rect = canvasRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const canvasX = Math.max(0, Math.min(1, x / rect.width))
  
  // Convert canvas position to actual waveform position
  const range = visibleRange.value
  const normalizedX = range.start + (canvasX * (range.end - range.start))

  // Update cursor based on hover position when not dragging
  if (!isDragging.value) {
    if (region.value) {
      const startHandlePos = (region.value.start - range.start) / (range.end - range.start)
      const endHandlePos = (region.value.end - range.start) / (range.end - range.start)
      if (Math.abs(canvasX - startHandlePos) * props.width < 8 || Math.abs(canvasX - endHandlePos) * props.width < 8) {
        cursorStyle.value = 'ew-resize'
        return
      } else if (normalizedX >= region.value.start && normalizedX <= region.value.end) {
        cursorStyle.value = 'move'
        return
      }
    }
    cursorStyle.value = 'default'
    return
  }

  // Handle region handle dragging
  if (handleBeingDragged.value && region.value) {
    if (handleBeingDragged.value === 'start') {
      region.value.start = normalizedX
    } else {
      region.value.end = normalizedX
    }
    drawWaveform()
    emit('regionDragging', {
      startTime: region.value.start * props.duration,
      endTime: region.value.end * props.duration,
    })
    return
  }

  // Handle region box dragging
  if (isDraggingRegion.value && region.value) {
    const delta = normalizedX - dragStartPosition.value
    const regionWidth = region.value.end - region.value.start
    let newStart = region.value.start + delta
    let newEnd = region.value.end + delta
    
    // Constrain to bounds
    if (newStart < 0) {
      newStart = 0
      newEnd = regionWidth
    }
    if (newEnd > 1) {
      newEnd = 1
      newStart = 1 - regionWidth
    }
    
    region.value.start = newStart
    region.value.end = newEnd
    dragStartPosition.value = normalizedX
    drawWaveform()
    emit('regionDragging', {
      startTime: region.value.start * props.duration,
      endTime: region.value.end * props.duration,
    })
    return
  }

  // Handle new region selection
  if (currentRegion.value) {
    currentRegion.value.end = normalizedX
    drawWaveform()
  }
}

const handleMouseUp = () => {
  if (handleBeingDragged.value && region.value) {
    handleBeingDragged.value = null
    isDragging.value = false
    const start = Math.min(region.value.start, region.value.end)
    const end = Math.max(region.value.start, region.value.end)
    region.value = { start, end }
    emit('regionUpdated', {
      startTime: start * props.duration,
      endTime: end * props.duration,
    })
    return
  }

  if (isDraggingRegion.value && region.value) {
    isDraggingRegion.value = false
    isDragging.value = false
    emit('regionUpdated', {
      startTime: region.value.start * props.duration,
      endTime: region.value.end * props.duration,
    })
    return
  }

  if (!isDragging.value || !currentRegion.value) return

  isDragging.value = false

  // Normalize region (ensure start < end)
  const start = Math.min(currentRegion.value.start, currentRegion.value.end)
  const end = Math.max(currentRegion.value.start, currentRegion.value.end)

  // Only keep region if it's meaningful (> 0.5% of total width)
  if (end - start > 0.005) {
    region.value = { start, end }
    
    // Emit region in seconds
    if (props.duration > 0) {
      emit('regionSelected', {
        startTime: start * props.duration,
        endTime: end * props.duration,
      })
    }
  } else {
    clearRegion()
  }

  currentRegion.value = null
  drawWaveform()
}

const handleMouseLeave = () => {
  if (isDragging.value) {
    handleMouseUp()
  }
}

const clearRegion = () => {
  region.value = null
  currentRegion.value = null
  emit('regionCleared')
  drawWaveform()
}

// Zoom and pan controls
const zoomIn = () => {
  zoomLevel.value = Math.min(zoomLevel.value * 1.5, 20) // Max 20x zoom
  
  // Adjust pan to keep playhead position as center point
  const playheadPosition = props.currentTime !== undefined && props.duration > 0 
    ? props.currentTime / props.duration 
    : 0.5 // Default to center if no playhead
  const newVisibleWidth = 1 / zoomLevel.value
  panOffset.value = playheadPosition - newVisibleWidth / 2
  
  drawWaveform()
}

const zoomOut = () => {
  zoomLevel.value = Math.max(zoomLevel.value / 1.5, 1) // Min 1x zoom
  
  if (zoomLevel.value === 1) {
    panOffset.value = 0
  } else {
    // Adjust pan to keep playhead position as center point
    const playheadPosition = props.currentTime !== undefined && props.duration > 0 
      ? props.currentTime / props.duration 
      : 0.5 // Default to center if no playhead
    const newVisibleWidth = 1 / zoomLevel.value
    panOffset.value = playheadPosition - newVisibleWidth / 2
  }
  
  drawWaveform()
}

const resetZoom = () => {
  zoomLevel.value = 1
  panOffset.value = 0
  drawWaveform()
}

const zoomToRange = (startTime: number, endTime: number, padding = 0.1) => {
  if (props.duration <= 0) return
  
  // Convert times to normalized positions
  const startNorm = startTime / props.duration
  const endNorm = endTime / props.duration
  const rangeWidth = endNorm - startNorm
  
  // Add padding on both sides (as a fraction of the range)
  const paddedWidth = rangeWidth * (1 + padding * 2)
  
  // Calculate required zoom level to fit the padded range
  const requiredZoom = 1 / paddedWidth
  zoomLevel.value = Math.max(1, Math.min(requiredZoom, 20)) // Clamp between 1x and 20x
  
  // Center the view on the middle of the range
  const rangeCenter = (startNorm + endNorm) / 2
  const visibleWidth = 1 / zoomLevel.value
  panOffset.value = rangeCenter - visibleWidth / 2
  
  // Ensure pan is within bounds
  panOffset.value = Math.max(0, Math.min(1 - visibleWidth, panOffset.value))
  
  drawWaveform()
}

const panLeft = () => {
  const visibleWidth = 1 / zoomLevel.value
  panOffset.value = Math.max(0, panOffset.value - visibleWidth * 0.1)
  drawWaveform()
}

const panRight = () => {
  const visibleWidth = 1 / zoomLevel.value
  const maxOffset = 1 - visibleWidth
  panOffset.value = Math.min(maxOffset, panOffset.value + visibleWidth * 0.1)
  drawWaveform()
}

const setRegion = (startTime: number, endTime: number) => {
  if (props.duration > 0) {
    region.value = {
      start: startTime / props.duration,
      end: endTime / props.duration,
    }
    drawWaveform()
  }
}

const handlePlayRegion = () => {
  if (region.value && props.duration > 0) {
    emit('playRegion', {
      startTime: region.value.start * props.duration,
      endTime: region.value.end * props.duration,
    })
  }
}

const handleCreateSlice = () => {
  emit('createSlice')
}

// Handle wheel events for horizontal panning only
const handleWheel = (e: WheelEvent) => {
  // Only handle horizontal scrolling for panning
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
    e.preventDefault()
    const visibleWidth = 1 / zoomLevel.value
    const panAmount = (e.deltaX / props.width) * visibleWidth
    const maxOffset = 1 - visibleWidth
    panOffset.value = Math.max(0, Math.min(maxOffset, panOffset.value + panAmount))
    drawWaveform()
  }
}

// Computed region info
const regionInfo = computed(() => {
  const activeRegion = region.value
  if (!activeRegion || props.duration === 0) return null

  const startTime = activeRegion.start * props.duration
  const endTime = activeRegion.end * props.duration
  const duration = endTime - startTime

  return { startTime, endTime, duration }
})

// Format time helper
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = (seconds % 60).toFixed(2)
  return `${mins}:${secs.padStart(5, '0')}`
}

// Redraw when waveform data or dimensions change
watch(
  () => [props.waveformData, props.width, props.height, props.color, props.currentTime, props.selectedSliceId, props.slices, props.waveformMode],
  () => {
    drawWaveform()
  },
  { immediate: true }
)

onMounted(() => {
  drawWaveform()
})

// Handle window resize
const handleResize = () => {
  drawWaveform()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

// Notify parent when zoom level changes (covers all zoom operations)
watch(zoomLevel, (z) => {
  emit('zoomChanged', z)
})

defineExpose({ clearRegion, setRegion, zoomToRange, zoomIn, zoomOut, resetZoom, panLeft, panRight, zoomLevel })
</script>

<template>
  <div class="waveform-viewer ">
    <!-- Zoom Controls -->
    <div v-if="props.showControls" class="zoom-controls">
      <button @click="emit('toggle-waveform-mode')" class="btn btn-sm btn-outline-primary" :title="props.waveformMode === 'line' ? 'Switch to bars view' : 'Switch to line view'">
        <i :class="props.waveformMode === 'line' ? 'fas fa-chart-bar' : 'fas fa-chart-line'"></i>
      </button>
      <button @click="resetZoom" class="btn btn-sm btn-outline-primary" title="Reset zoom (1:1)">
        <i class="fas fa-search-minus"></i> Reset
      </button>
      <button @click="zoomOut" class="btn btn-sm btn-outline-primary" :disabled="zoomLevel === 1" title="Zoom out">
        −
      </button>
      <span class="zoom-level">{{ zoomLevel.toFixed(1) }}×</span>
      <button @click="zoomIn" class="btn btn-sm btn-outline-primary" :disabled="zoomLevel >= 20" title="Zoom in">
        +
      </button>
      <div class="pan-controls" v-if="zoomLevel > 1">
        <button @click="panLeft" class="btn btn-sm btn-outline-primary" title="Pan left">
          <i class="fas fa-chevron-left"></i>
        </button>
        <button @click="panRight" class="btn btn-sm btn-outline-primary" title="Pan right">
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>

    <div class="canvas-wrapper">
      <!-- Playhead handle -->
      <div 
        v-if="playheadPosition !== null"
        class="playhead-handle"
        :style="{ left: playheadPosition }"
        @mousedown.stop="handlePlayheadHandleMouseDown"
      ></div>

      <canvas 
        ref="canvasRef" 
        class="waveform-canvas"
        :style="{ cursor: cursorStyle }"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseLeave"
        @dblclick="handleDoubleClick"
        @wheel="handleWheel"
      ></canvas>
    </div>
    
    <div v-if="!waveformData" class="waveform-placeholder">
      No waveform data
    </div>

  </div>
</template>

<style scoped>
.waveform-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  font-size: 0.85rem;
}



.zoom-level {
  min-width: 3rem;
  text-align: center;
  font-family: 'Courier New', monospace;
  color: #4a9eff;
}

.pan-controls {
  display: flex;
  gap: 0.5rem;
  margin-left: 0.5rem;
  padding-left: 0.5rem;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.zoom-hint {
  margin-left: auto;
  opacity: 0.5;
  font-size: 0.75rem;
}

.canvas-wrapper {
  position: relative;
  flex: 1;
  width: 100%;
}

.playhead-handle {
  position: absolute;
  top: -8px;
  width: 16px;
  height: 16px;
  margin-left: -8px;
  background: #ff6b6b;
  border: 2px solid #ffffff;
  border-radius: 50%;
  cursor: grab;
  z-index: 10;
  transition: transform 0.1s ease;
  pointer-events: auto;
}

.playhead-handle:hover {
  transform: scale(1.2);
}

.playhead-handle:active {
  cursor: grabbing;
  transform: scale(1.1);
}

.waveform-canvas {
  width: 100%;
  height: 100%;
  display: block;
  cursor: crosshair;
  border-radius: 4px;
}

.waveform-placeholder {
  position: absolute;
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.9rem;
}

.region-info {
  position: absolute;
  bottom: 0.5rem;
  left: 0.5rem;
  right: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(74, 158, 255, 0.5);
  border-radius: 6px;
  font-size: 0.85rem;
  font-family: 'Courier New', monospace;
}

.duration {
  opacity: 0.7;
}

.btn-clear {
  margin-left: auto;
  padding: 0.25rem 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
}
</style>
