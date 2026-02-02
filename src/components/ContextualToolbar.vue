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
        <button @click.stop="emit('clearSelection')" class="btn btn-sm btn-outline-secondary visually-hidden">✕</button>
      </template>

      <!-- Slice Edit Mode -->
      <template v-if="mode === 'slice' && slice">
        <div class="btn-group align-self-start" role="group">
          <button @click.stop="emit('seekToSlice', slice)" class="btn btn-primary" style="width: 40px; height: 40px;" title="Jump playhead to slice start">
            <i class="fas fa-step-backward"></i>
          </button>
          <button @click.stop="emit('zoomToSlice', slice)" class="btn btn-outline-primary" style="width: 40px; height: 40px;" title="Zoom to fit slice">
            <i class="fas fa-search-plus"></i>
          </button>
          <button v-if="!editingMetadata" @click.stop="toggleEditMetadata" class="btn btn-outline-secondary" style="width: 40px; height: 40px;" title="Edit metadata">
            <i class="fas fa-pencil-alt"></i>
          </button>
          <button v-else @click.stop="cancelEditMetadata" class="btn btn-outline-secondary" style="width: 40px; height: 40px;" title="Cancel edits">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div v-if="!editingMetadata" class="slice-info">
          <p class="m-0"><strong>{{ slice.title }}</strong></p>
          <p class="text-muted">{{ formatTime(selection?.startTime ?? slice.startTime) }} - {{ formatTime(selection?.endTime ?? slice.endTime) }}</p>
        </div>
        <div class="metadata-inline d-flex align-items-center gap-2 flex-wrap">
          <template v-if="!editingMetadata">
            <span v-if="slice.type" class="badge bg-secondary">{{ slice.type }}</span>
            <span v-for="c in (slice.composers || [])" :key="'c-'+c" class="badge bg-secondary">{{ c }}</span>
            <span v-for="p in (slice.performers || [])" :key="'p-'+p" class="badge bg-secondary">{{ p }}</span>
            <span v-for="t in (slice.tags || [])" :key="'t-'+t" class="badge bg-dark">#{{ t }}</span>
          </template>
          <template v-else>
            <input class="form-control form-control-sm w-auto" style="max-width: 220px;" v-model="titleInput" placeholder="Title" />
            <input class="form-control form-control-sm w-auto" style="max-width: 140px;" v-model="typeInput" placeholder="Type" />
            <input class="form-control form-control-sm w-auto" style="max-width: 180px;" v-model="composersInput" placeholder="Composers (comma)" />
            <input class="form-control form-control-sm w-auto" style="max-width: 180px;" v-model="performersInput" placeholder="Performers (comma)" />
            <input class="form-control form-control-sm w-auto" style="max-width: 180px;" v-model="tagsInput" placeholder="Tags (comma)" />
            <div class="w-100"></div>
            <textarea class="form-control form-control-sm notes-input flex-grow-1" rows="2" v-model="notesInput" placeholder="Notes"></textarea>
          </template>
        </div>
        <div class="actions">
          <button @click="saveWithMetadata()" class="btn btn-success rounded-circle p-0" style="width: 40px; height: 40px;" title="Save slice">
            <i class="fas fa-save"></i>
          </button>
          <button @click="emit('deleteSlice', slice.id)" class="btn btn-danger rounded-circle p-0" style="width: 40px; height: 40px;" title="Delete slice">
            <i class="fas fa-trash"></i>
          </button>
        </div>
        <button @click.stop="emit('clearSelection')" class="btn btn-sm btn-outline-secondary visually-hidden">✕</button>
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
  saveSlice: [metadata?: { title?: string; type?: string; composers?: string[]; performers?: string[]; tags?: string[]; notes?: string }]
  deleteSlice: [sliceId: string]
  clearSelection: []
  'update:title': [value: string]
}>()

// Inline metadata editing state
const editingMetadata = ref(false)
const titleInput = ref('')
const typeInput = ref('')
const composersInput = ref('')
const performersInput = ref('')
const tagsInput = ref('')
const notesInput = ref('')

const setInputsFromSlice = (s: Slice | null) => {
  if (!s) return
  titleInput.value = s.title || ''
  typeInput.value = s.type || ''
  composersInput.value = (s.composers || []).join(', ')
  performersInput.value = (s.performers || []).join(', ')
  tagsInput.value = (s.tags || []).join(', ')
  notesInput.value = s.notes || ''
}

watch(() => props.slice, (s) => {
  setInputsFromSlice(s)
}, { immediate: true })

const toggleEditMetadata = () => {
  editingMetadata.value = !editingMetadata.value
}

const saveWithMetadata = () => {
  const metadata = {
    title: titleInput.value.trim() || undefined,
    type: typeInput.value.trim() || undefined,
    composers: composersInput.value.split(',').map(s => s.trim()).filter(Boolean),
    performers: performersInput.value.split(',').map(s => s.trim()).filter(Boolean),
    tags: tagsInput.value.split(',').map(s => s.trim()).filter(Boolean),
    notes: notesInput.value.trim() || undefined,
  }
  emit('saveSlice', metadata)
}

const cancelEditMetadata = () => {
  setInputsFromSlice(props.slice)
  editingMetadata.value = false
}
</script>

<style scoped>
.contextual-toolbar {
  
  border-top: 1px solid #333;
  padding: 1rem;
  min-height: 80px;
  display: flex;
  align-items: center;
}

.toolbar-content {
  width: 100%;
  display: flex;
  align-items: flex-start;
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

.metadata-inline .badge {
  font-weight: 500;
}

.notes-input {
  min-width: 300px;
}

.metadata-toggle {
  flex: 0 0 auto;
}

.metadata-wrapper {
  flex: 1 1 auto;
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