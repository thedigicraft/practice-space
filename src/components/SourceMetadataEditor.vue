<template>
  <div class="source-metadata-editor">
    <div class="modal-overlay" @click="$emit('close')"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2>Edit Source Metadata</h2>
        <button class="btn-close" @click="$emit('close')">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-body">
        <form @submit.prevent="handleSave">
          <div class="form-group">
            <label for="title">Title</label>
            <input
              id="title"
              v-model="formData.title"
              type="text"
              class="form-control"
              placeholder="Enter title"
            />
          </div>

          <div class="form-group">
            <label for="filename">Filename</label>
            <input
              id="filename"
              :value="source.name"
              type="text"
              class="form-control"
              disabled
            />
          </div>

          <div class="form-group">
            <label for="location">Location</label>
            <div class="position-relative">
              <input
                id="location"
                v-model="formData.location"
                @input="handleLocationInput"
                @focus="handleLocationInput"
                @blur="handleLocationBlur"
                type="text"
                class="form-control"
                placeholder="e.g., Concert Hall, Studio A, Practice Room"
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
          </div>

          <div class="form-group">
            <label for="createdDate">Created Date</label>
            <input
              id="createdDate"
              v-model="createdDateString"
              type="datetime-local"
              class="form-control"
            />
          </div>

          <div class="form-group">
            <label for="notes">Notes</label>
            <textarea
              id="notes"
              v-model="formData.notes"
              class="form-control"
              rows="4"
              placeholder="Additional notes about this source file..."
            ></textarea>
          </div>

          <div class="metadata-info">
            <div class="info-item">
              <span class="label">Duration:</span>
              <span class="value">{{ formatDuration(source.duration) }}</span>
            </div>
            <div class="info-item">
              <span class="label">Sample Rate:</span>
              <span class="value">{{ source.sampleRate }} Hz</span>
            </div>
            <div class="info-item">
              <span class="label">Channels:</span>
              <span class="value">{{ source.numberOfChannels }}</span>
            </div>
            <div class="info-item">
              <span class="label">File Size:</span>
              <span class="value">{{ formatFileSize(source.size) }}</span>
            </div>
            <div class="info-item">
              <span class="label">Imported:</span>
              <span class="value">{{ formatDate(source.importedAt) }}</span>
            </div>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="$emit('close')">Cancel</button>
        <button class="btn-primary" @click="handleSave">Save</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import type { Source } from '@/types/models'
import { formatTime, formatFileSize } from '@/utils/helpers'

interface Props {
  source: Source
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  save: [metadata: Partial<Source>]
}>()

// Get all sources to extract existing locations
const sources = inject<{ value: Source[] }>('sources', { value: [] })

// Extract unique locations from all sources
const existingLocations = computed(() => {
  const locations = new Set<string>()
  sources.value.forEach(source => {
    if (source.location && source.location.trim()) {
      locations.add(source.location.trim())
    }
  })
  return Array.from(locations).sort()
})

const formData = ref({
  title: props.source.title || props.source.name.replace(/\.[^/.]+$/, ''),
  location: props.source.location || '',
  notes: props.source.notes || '',
  createdAt: props.source.createdAt || props.source.importedAt,
})

// Location autocomplete state
const showLocationSuggestions = ref(false)
const locationSuggestions = ref<string[]>([])

const handleLocationInput = () => {
  const input = formData.value.location.toLowerCase().trim()
  
  if (!input) {
    locationSuggestions.value = existingLocations.value
  } else {
    locationSuggestions.value = existingLocations.value.filter(location =>
      location.toLowerCase().includes(input)
    )
  }
  
  showLocationSuggestions.value = true
}

const handleLocationBlur = () => {
  // Use setTimeout to allow click events on suggestions to fire first
  setTimeout(() => {
    showLocationSuggestions.value = false
  }, 200)
}

const selectLocationSuggestion = (suggestion: string) => {
  formData.value.location = suggestion
  showLocationSuggestions.value = false
}

const createdDateString = computed({
  get: () => {
    const date = new Date(formData.value.createdAt)
    // Format to datetime-local format (YYYY-MM-DDTHH:mm)
    return date.toISOString().slice(0, 16)
  },
  set: (value: string) => {
    formData.value.createdAt = new Date(value).getTime()
  }
})

const formatDuration = (seconds: number) => formatTime(seconds)

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString()
}

const handleSave = () => {
  emit('save', {
    title: formData.value.title,
    location: formData.value.location,
    notes: formData.value.notes,
    createdAt: formData.value.createdAt,
  })
}
</script>

<style scoped>
.source-metadata-editor {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
}

.modal-content {
  position: relative;
  background: #252525;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #353535;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  color: #fff;
  font-size: 1.3rem;
}

.btn-close {
  background: transparent;
  border: none;
  color: #888;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.5rem;
  transition: color 0.2s;
}

.btn-close:hover {
  color: #fff;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: 1.5rem;
  position: relative;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #ccc;
  font-weight: 500;
  font-size: 0.9rem;
}

.position-relative {
  position: relative;
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
  z-index: 1000;
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

.form-control {
  width: 100%;
  padding: 0.75rem;
  background: #1a1a1a;
  border: 1px solid #404040;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: #4a9eff;
}

.form-control:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

textarea.form-control {
  resize: vertical;
  font-family: inherit;
}

.metadata-info {
  background: #1a1a1a;
  border: 1px solid #353535;
  border-radius: 4px;
  padding: 1rem;
  margin-top: 1.5rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #2a2a2a;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item .label {
  color: #888;
  font-size: 0.85rem;
}

.info-item .value {
  color: #e0e0e0;
  font-size: 0.85rem;
  font-weight: 500;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #353535;
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.btn-secondary,
.btn-primary {
  padding: 0.65rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-secondary {
  background: transparent;
  border: 1px solid #404040;
  color: #e0e0e0;
}

.btn-secondary:hover {
  background: #303030;
}

.btn-primary {
  background: #4a9eff;
  color: white;
}

.btn-primary:hover {
  background: #357abd;
}
</style>
