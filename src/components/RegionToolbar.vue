<template>
  <div class="region-toolbar" :style="style">
    <div class="toolbar-content">
      <button @click.stop="emit('play')" class="btn-play">
        {{ isPlaying ? '⏸' : '▶' }}
      </button>
      <div class="region-info">
        <p>
          <strong>Selection</strong>
        </p>
        <p>{{ formatTime(startTime) }} - {{ formatTime(endTime) }}</p>
        <p class="duration">({{ formatDuration(duration) }})</p>
      </div>
      <div class="actions">
        <button @click.stop="emit('createSlice')" class="btn-create">
          Create Slice
        </button>
        <button @click.stop="emit('export')" class="btn-export" disabled>
          Export
        </button>
      </div>
      <button @click.stop="emit('clear')" class="btn-clear">✕</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatTime } from '../utils/helpers'

interface Props {
  startTime: number
  endTime: number
  top: number
  left: number
  width: number
  isPlaying: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  play: []
  createSlice: []
  export: []
  clear: []
}>()

const duration = computed(() => props.endTime - props.startTime)

const style = computed(() => ({
  top: `${props.top}px`,
  left: `${props.left}px`,
  width: `${props.width}px`,
}))

const formatDuration = (seconds: number) => {
  return `${seconds.toFixed(2)}s`
}
</script>

<style scoped>
.region-toolbar {
  position: absolute;
  background: #1e1e1e;
  border: 1px solid #4a9eff;
  border-radius: 8px;
  padding: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  z-index: 10;
  transform: translateY(10px);
  transition: all 0.2s;
  min-width: 300px;
}

.toolbar-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.btn-play {
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
}

.btn-play:hover {
  background: #357abd;
}

.region-info {
  flex: 1;
  font-size: 0.85rem;
  color: #ccc;
}

.region-info p {
  margin: 0;
  line-height: 1.4;
}

.region-info .duration {
  font-size: 0.8rem;
  color: #888;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.btn-create,
.btn-export {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
  border: 1px solid;
}

.btn-create {
  background: #4a9eff;
  color: white;
  border-color: #4a9eff;
}

.btn-create:hover {
  background: #357abd;
}

.btn-export:disabled {
  background: #333;
  color: #777;
  border-color: #444;
  cursor: not-allowed;
}

.btn-clear {
  background: none;
  border: none;
  color: #888;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 0.5rem;
}

.btn-clear:hover {
  color: #fff;
}
</style>