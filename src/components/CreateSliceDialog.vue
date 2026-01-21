<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Slice } from '@/types/models'

interface Props {
  sourceId: string
  sourceName: string
  startTime: number
  endTime: number
  existingSlice?: Slice // For edit mode
}

const props = defineProps<Props>()

const emit = defineEmits<{
  cancel: []
  create: [slice: Omit<Slice, 'id' | 'createdAt' | 'updatedAt'>]
  update: [slice: Slice]
}>()

const isEditMode = computed(() => !!props.existingSlice)

const title = ref('')
const notes = ref('')
const tags = ref('')

// Initialize form with existing data in edit mode
watch(() => props.existingSlice, (slice) => {
  if (slice) {
    title.value = slice.title
    notes.value = slice.notes || ''
    tags.value = slice.tags?.join(', ') || ''
  }
}, { immediate: true })

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = (seconds % 60).toFixed(2)
  return `${mins}:${secs.padStart(5, '0')}`
}

const handleSave = () => {
  if (!title.value.trim()) {
    return
  }

  const sliceTags = tags.value
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0)

  if (isEditMode.value && props.existingSlice) {
    // Update existing slice
    const updatedSlice: Slice = {
      ...props.existingSlice,
      title: title.value.trim(),
      notes: notes.value.trim() || undefined,
      tags: sliceTags.length > 0 ? sliceTags : undefined,
      updatedAt: Date.now(),
    }
    emit('update', updatedSlice)
  } else {
    // Create new slice
    const slice: Omit<Slice, 'id' | 'createdAt' | 'updatedAt'> = {
      audioFileId: props.sourceId,
      title: title.value.trim(),
      notes: notes.value.trim() || undefined,
      startTime: props.startTime,
      endTime: props.endTime,
      tags: sliceTags.length > 0 ? sliceTags : undefined,
    }
    emit('create', slice)
  }
}

const handleCancel = () => {
  emit('cancel')
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @click="handleCancel">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header">
          <h2>{{ isEditMode ? 'Edit Slice' : 'Create Slice' }}</h2>
          <button class="btn-close" @click="handleCancel">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>Source File</label>
            <div class="readonly-field">{{ sourceName }}</div>
          </div>

          <div class="form-group">
            <label>Region</label>
            <div class="readonly-field">
              {{ formatTime(startTime) }} - {{ formatTime(endTime) }}
              <span class="duration">({{ formatTime(endTime - startTime) }})</span>
            </div>
          </div>

          <div class="form-group">
            <label for="slice-title">Title *</label>
            <input
              id="slice-title"
              v-model="title"
              type="text"
              placeholder="Enter slice title"
              class="form-input"
              autofocus
            />
          </div>

          <div class="form-group">
            <label for="slice-notes">Notes</label>
            <textarea
              id="slice-notes"
              v-model="notes"
              placeholder="Add notes about this slice"
              class="form-textarea"
              rows="3"
            ></textarea>
          </div>

          <div class="form-group">
            <label for="slice-tags">Tags</label>
            <input
              id="slice-tags"
              v-model="tags"
              type="text"
              placeholder="Comma-separated tags"
              class="form-input"
            />
          </div>
        </div>

        <div class="modal-footer">
          <button @click="handleCancel" class="btn-secondary">
            Cancel
          </button>
          <button
            @click="handleSave"
            class="btn-primary"
            :disabled="!title.trim()"
          >
            {{ isEditMode ? 'Save Changes' : 'Create Slice' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-dialog {
  background: #2a2a2a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.btn-close {
  background: none;
  border: none;
  color: inherit;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.btn-close:hover {
  opacity: 1;
}

.modal-body {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.9rem;
}

.readonly-field {
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
}

.duration {
  opacity: 0.7;
  margin-left: 0.5rem;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: inherit;
  font-family: inherit;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #4a9eff;
}

.form-textarea {
  resize: vertical;
}

.modal-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-secondary,
.btn-primary {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: inherit;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
}

.btn-primary {
  background: #4a9eff;
  color: white;
  border: 1px solid #4a9eff;
}

.btn-primary:hover:not(:disabled) {
  background: #3a8eef;
}

.btn-secondary:disabled,
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
