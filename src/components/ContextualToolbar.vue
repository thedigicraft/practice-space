<template>
  <div class="contextual-toolbar p-3">
    <div v-if="selection" class="toolbar-content">
      <!-- Region Selection Mode -->
      <template v-if="mode === 'region'">
        <button @click.stop="emit('playRegion')" class="btn btn-primary rounded-circle p-0" style="width: 40px; height: 40px;">
          <i :class="isPlaying ? 'fas fa-pause' : 'fas fa-play'"></i>
        </button>
        <div class="region-info">
          <p class="m-0">{{ formatTime(selection.startTime) }} - {{ formatTime(selection.endTime) }}</p>
        </div>
        <input 
          type="text" 
          class="form-control slice-title-input" 
          placeholder="Slice title (optional)"
          :value="title"
          @input="emit('update:title', ($event.target as HTMLInputElement).value)"
          @keyup.enter="emit('createSlice')"
        />
        <div class="actions">
          <button @click.stop="emit('createSlice')" class="btn btn-primary">
            Create Slice
          </button>
          <button class="btn btn-secondary" disabled>Export</button>
        </div>
        <button @click.stop="emit('clearSelection')" class="btn btn-sm btn-outline-secondary">✕</button>
      </template>

      <!-- Slice Edit Mode -->
      <template v-if="mode === 'slice' && slice">
        <div class="btn-group" role="group">
          <button @click.stop="emit('seekToSlice', slice)" class="btn btn-primary" style="width: 40px; height: 40px;" title="Jump playhead to slice start">
            <i class="fas fa-step-backward"></i>
          </button>
          <button @click.stop="emit('zoomToSlice', slice)" class="btn btn-outline-primary" style="width: 40px; height: 40px;" title="Zoom to fit slice">
            <i class="fas fa-search-plus"></i>
          </button>
        </div>
        <div class="slice-info">
          <p class="m-0"><strong>{{ slice.title }}</strong></p>
          <p class="text-muted">{{ formatTime(selection?.startTime ?? slice.startTime) }} - {{ formatTime(selection?.endTime ?? slice.endTime) }}</p>
        </div>
        <div class="actions">
          <button @click="emit('saveSlice')" class="btn btn-success">Save</button>
          <button @click="emit('deleteSlice', slice.id)" class="btn btn-danger">Delete</button>
        </div>
        <button @click.stop="emit('clearSelection')" class="btn btn-sm btn-outline-secondary">✕</button>
      </template>
    </div>
    <div v-else class="empty-state">
      <p>Select a region or a slice to see editing tools</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Slice } from '../types/models'
import { formatTime } from '../utils/helpers'

interface Selection {
  startTime: number
  endTime: number
}

interface Props {
  mode: 'region' | 'slice' | null
  selection: Selection | null
  slice: Slice | null
  isPlaying: boolean
  title?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  playRegion: []
  seekToSlice: [slice: Slice]
  zoomToSlice: [slice: Slice]
  createSlice: []
  saveSlice: []
  deleteSlice: [sliceId: string]
  clearSelection: []
  'update:title': [value: string]
}>()
</script>

<style scoped>
.contextual-toolbar {
  background: #1e1e1e;
  border-top: 1px solid #333;
  padding: 1rem;
  min-height: 80px;
  display: flex;
  align-items: center;
}

.toolbar-content {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.empty-state {
  width: 100%;
  text-align: center;
  color: #888;
}

.region-info {
  font-size: 0.9rem;
  color: #ccc;
}
.region-info p {
  margin: 0;
}

.slice-info {
  font-size: 0.9rem;
  color: #ccc;
}
.slice-info p {
  margin: 0;
}
.slice-info .text-muted {
  color: #888 !important;
  font-size: 0.85rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}

.slice-title-input {
  flex: 1;
  max-width: 300px;
  background: #2a2a2a;
  border: 1px solid #444;
  color: #fff;
}

.slice-title-input:focus {
  background: #2a2a2a;
  border-color: #0d6efd;
  color: #fff;
}
</style>