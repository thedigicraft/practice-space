<template>
  <div class="source-metadata px-4 py-3">
    <div class="source-title d-flex justify-content-between align-items-center">
      <div class="d-flex align-items-center gap-3 flex-wrap">
        <input
          v-if="isEditing"
          v-model="titleValue"
          @blur="saveName"
          @keyup.enter="saveName"
          @keyup.esc="cancelEdit"
          class="form-control"
          ref="titleInput"
        />
        <h1 
          v-else
          @dblclick="startEdit"
          :title="'Double-click to edit'"
          class="editable-title"
        >
          {{ title }}
        </h1>
        <span v-if="location" class="text-muted small ms-1 d-flex align-items-center">
          <i class="fas fa-map-marker-alt me-1"></i>{{ location }}
        </span>
        <span class="text-muted small d-flex align-items-center">
          <i class="fas fa-calendar me-1"></i>{{ inlineDateText }}
        </span>
        <button
          class="btn btn-sm bg-transparent border-0 text-secondary p-0 ms-1"
          type="button"
          @click="toggleMetaForm"
          :aria-expanded="showMetaForm ? 'true' : 'false'"
          aria-controls="source-meta-collapse"
          title="Edit source metadata"
        >
          <i class="fas fa-pencil-alt"></i>
        </button>
      </div>
      <div class="source-metadata d-flex justify-content-center flex-wrap gap-4">
        <span class="metadata-item">
          <i class="fas fa-file-audio me-1"></i>{{ filename }}
        </span>
        <span class="metadata-item">
          <i class="fas fa-clock me-1"></i>{{ formatDuration(duration) }}
        </span>
        <span class="metadata-item">
          <i class="fas fa-hdd me-1"></i>{{ formatFileSize(size) }}
        </span>
        <span class="metadata-item">
          <i class="fas fa-wave-square me-1"></i>{{ sampleRate }}Hz
        </span>
        <span class="metadata-item">
          <i class="fas fa-volume-up me-1"></i>{{ numberOfChannels }} channel{{ numberOfChannels > 1 ? 's' : '' }}
        </span>
      </div>
    </div>

    <!-- Inline collapsible metadata form -->
    <div :id="'source-meta-collapse'" class="meta-collapse" v-show="showMetaForm">
      <form @submit.prevent="handleSaveMeta" class="meta-form mt-3">
        <div class="row g-3">
          <div class="col-12 col-md-6">
            <label class="form-label">Title</label>
            <input v-model="formData.title" type="text" class="form-control" placeholder="Enter title" />
          </div>
          <div class="col-12 col-md-6 position-relative">
            <label class="form-label">Location</label>
            <input
              v-model="formData.location"
              @input="handleLocationInput"
              @focus="handleLocationInput"
              @blur="handleLocationBlur"
              type="text"
              class="form-control"
              placeholder="e.g., Concert Hall, Studio A"
            />
            <div v-if="showLocationSuggestions && locationSuggestions.length > 0" class="autocomplete-dropdown">
              <div
                v-for="suggestion in locationSuggestions"
                :key="suggestion"
                @mousedown="selectLocationSuggestion(suggestion)"
                class="autocomplete-item"
              >
                {{ suggestion }}
              </div>
            </div>
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label">Created Date</label>
            <input v-model="createdDateString" type="datetime-local" class="form-control" />
          </div>
          <div class="col-12">
            <label class="form-label">Notes</label>
            <textarea v-model="formData.notes" class="form-control" rows="3" placeholder="Additional notes..."></textarea>
          </div>
        </div>
        <div class="d-flex gap-2 mt-3">
          <button type="button" class="btn btn-outline-secondary" @click="toggleMetaForm">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, computed, inject, watch } from 'vue'
import { formatTime, formatFileSize } from '@/utils/helpers'
import type { Source } from '@/types/models'

interface Props {
  title: string
  filename: string
  duration: number
  size: number
  sampleRate: number
  numberOfChannels: number
  location?: string
  importedAt: number
  createdAt?: number
  notes?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  updateTitle: [title: string]
  saveMetadata: [metadata: Partial<Source>]
}>()

const isEditing = ref(false)
const titleValue = ref(props.title)
const titleInput = ref<HTMLInputElement>()
const showMetaForm = ref(false)

// Inline metadata form state
const formData = ref({
  title: props.title,
  location: props.location || '',
  notes: props.notes || '',
  createdAt: props.createdAt || props.importedAt,
})

// Inject sources to build location suggestions
const sources = inject<{ value: Source[] }>('sources', { value: [] })
const existingLocations = computed(() => {
  const set = new Set<string>()
  sources.value.forEach(s => { if (s.location?.trim()) set.add(s.location.trim()) })
  return Array.from(set).sort()
})

const showLocationSuggestions = ref(false)
const locationSuggestions = ref<string[]>([])

const handleLocationInput = () => {
  const input = formData.value.location.toLowerCase().trim()
  locationSuggestions.value = input
    ? existingLocations.value.filter(l => l.toLowerCase().includes(input))
    : existingLocations.value
  showLocationSuggestions.value = true
}

const handleLocationBlur = () => {
  setTimeout(() => { showLocationSuggestions.value = false }, 200)
}

const selectLocationSuggestion = (s: string) => {
  formData.value.location = s
  showLocationSuggestions.value = false
}

const createdDateString = computed({
  get: () => new Date(formData.value.createdAt).toISOString().slice(0, 16),
  set: (v: string) => { formData.value.createdAt = new Date(v).getTime() }
})

const startEdit = () => {
  titleValue.value = props.title
  isEditing.value = true
  nextTick(() => {
    titleInput.value?.focus()
    titleInput.value?.select()
  })
}

const saveName = () => {
  if (titleValue.value.trim() && titleValue.value !== props.title) {
    emit('updateTitle', titleValue.value.trim())
  }
  isEditing.value = false
}

const cancelEdit = () => {
  titleValue.value = props.title
  isEditing.value = false
}

const formatDuration = (seconds: number) => formatTime(seconds)

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}

// Prefer createdAt if present, otherwise show importedAt
const inlineDateText = computed(() => {
  return props.createdAt ? formatDate(props.createdAt) : formatDate(props.importedAt)
})

const toggleMetaForm = () => {
  // refresh data from props when opening
  if (!showMetaForm.value) {
    formData.value = {
      title: props.title,
      location: props.location || '',
      notes: props.notes || '',
      createdAt: props.createdAt || props.importedAt,
    }
  }
  showMetaForm.value = !showMetaForm.value
}

const handleSaveMeta = () => {
  const payload: Partial<Source> = {
    title: formData.value.title?.trim() || undefined,
    location: formData.value.location?.trim() || undefined,
    notes: formData.value.notes?.trim() || undefined,
    createdAt: formData.value.createdAt,
    updatedAt: Date.now(),
  }
  emit('saveMetadata', payload)
  showMetaForm.value = false
}
</script>

<style scoped lang="scss">

.source-title {
  margin-bottom: 1rem;

  h1 {
    margin: 0;
    font-size: 1.75rem;
    color: var(--bs-body-color);
  }

  .form-control {
    font-size: 1.75rem;
    font-weight: 700;
    padding: 0.25rem 0.5rem;
  }
}

.editable-title {
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.7;
  }
}

.metadata-item {
  font-size: 0.9rem;
  color: var(--bs-secondary-color);
  white-space: nowrap;

  i {
    color: var(--bs-primary);
  }
}

.meta-collapse {
  overflow: hidden;
}

.meta-form .form-label {
  color: #ccc;
}

.autocomplete-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #1a1a1a;
  border: 1px solid #4a9eff;
  border-top: none;
  border-radius: 0 0 4px 4px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.autocomplete-item {
  padding: 0.6rem 0.75rem;
  cursor: pointer;
  transition: background 0.15s;
  color: #e0e0e0;
  font-size: 0.9rem;
}

.autocomplete-item:hover {
  background: #2a2a2a;
  color: #4a9eff;
}
</style>
