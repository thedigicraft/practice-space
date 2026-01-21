<template>
  <div class="contextual-toolbar">
    <div v-if="selection" class="toolbar-content">
      <!-- Region Selection Mode -->
      <template v-if="mode === 'region'">
        <button @click.stop="emit('playRegion')" class="btn btn-primary rounded-circle p-0" style="width: 40px; height: 40px;">
          {{ isPlaying ? '⏸' : '▶' }}
        </button>
        <div class="region-info">
          <p><strong>New Selection</strong></p>
          <p>{{ formatTime(selection.startTime) }} - {{ formatTime(selection.endTime) }}</p>
        </div>
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
        <button @click.stop="emit('playSlice', slice)" class="btn btn-primary rounded-circle p-0" style="width: 40px; height: 40px;">
          {{ isPlaying ? '⏸' : '▶' }}
        </button>
        <div class="slice-edit-form">
          <input v-model="editableSlice.title" placeholder="Slice Title" class="form-control form-control-sm" />
          <input v-model="editableSlice.notes" placeholder="Notes" class="form-control form-control-sm" />
          <input v-model="tagsInput" placeholder="Tags (comma-separated)" class="form-control form-control-sm" @keyup.enter="save" />
        </div>
        <div class="actions">
          <button @click="save" class="btn btn-success">Save</button>
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
}

const props = defineProps<Props>()

const emit = defineEmits<{
  playRegion: []
  playSlice: [slice: Slice]
  createSlice: []
  updateSlice: [slice: Slice]
  deleteSlice: [sliceId: string]
  clearSelection: []
}>()

const editableSlice = ref<Partial<Slice>>({})
const tagsInput = ref('')

watch(() => props.slice, (newSlice) => {
  if (newSlice) {
    editableSlice.value = { ...newSlice }
    tagsInput.value = newSlice.tags?.join(', ') || ''
  }
}, { immediate: true })

const save = () => {
  if (props.mode === 'slice' && props.slice) {
    const updatedSlice: Slice = {
      ...props.slice,
      ...editableSlice.value,
      tags: tagsInput.value.split(',').map(t => t.trim()).filter(Boolean),
      updatedAt: Date.now(),
    }
    emit('updateSlice', updatedSlice)
  }
}
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

.slice-edit-form {
  flex: 1;
  display: flex;
  gap: 0.75rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}
</style>