<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type { Slice } from '@/types/models'
import { Modal } from 'bootstrap'

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

const modalElement = ref<HTMLElement | null>(null)
let modalInstance: Modal | null = null

// Track pending action to emit after modal hides
let pendingAction: { type: 'cancel' | 'create' | 'update', data?: any } | null = null

onMounted(() => {
  if (modalElement.value) {
    modalInstance = new Modal(modalElement.value)
    modalInstance.show()
    
    // Listen for modal hide event and emit the pending action
    modalElement.value.addEventListener('hidden.bs.modal', () => {
      if (pendingAction) {
        if (pendingAction.type === 'cancel') {
          emit('cancel')
        } else if (pendingAction.type === 'create') {
          emit('create', pendingAction.data)
        } else if (pendingAction.type === 'update') {
          emit('update', pendingAction.data)
        }
      } else {
        // If no pending action, it means the modal was dismissed (X button or backdrop)
        emit('cancel')
      }
      pendingAction = null
    })
  }
})

onBeforeUnmount(() => {
  if (modalInstance) {
    modalInstance.dispose()
  }
})

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
    pendingAction = { type: 'update', data: updatedSlice }
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
    pendingAction = { type: 'create', data: slice }
  }
  
  // Hide modal - will emit after hidden
  if (modalInstance) {
    modalInstance.hide()
  }
}

const handleCancel = () => {
  pendingAction = { type: 'cancel' }
  if (modalInstance) {
    modalInstance.hide()
  }
}
</script>

<template>
  <Teleport to="body">
    <div ref="modalElement" class="modal fade" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content bg-dark text-light">
          <div class="modal-header border-secondary">
            <h5 class="modal-title">{{ isEditMode ? 'Edit Slice' : 'Create Slice' }}</h5>
            <button type="button" class="btn-close btn-close-white" @click="handleCancel" aria-label="Close"></button>
          </div>

          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Source File</label>
              <div class="form-control-plaintext text-light">{{ sourceName }}</div>
            </div>

            <div class="mb-3">
              <label class="form-label">Region</label>
              <div class="form-control-plaintext text-light">
                {{ formatTime(startTime) }} - {{ formatTime(endTime) }}
                <span class="text-muted">({{ formatTime(endTime - startTime) }})</span>
              </div>
            </div>

            <div class="mb-3">
              <label for="slice-title" class="form-label">Title *</label>
              <input
                id="slice-title"
                v-model="title"
                type="text"
                placeholder="Enter slice title"
                class="form-control"
                autofocus
              />
            </div>

            <div class="mb-3">
              <label for="slice-notes" class="form-label">Notes</label>
              <textarea
                id="slice-notes"
                v-model="notes"
                placeholder="Add notes about this slice"
                class="form-control"
                rows="3"
              ></textarea>
            </div>

            <div class="mb-3">
              <label for="slice-tags" class="form-label">Tags</label>
              <input
                id="slice-tags"
                v-model="tags"
                type="text"
                placeholder="Comma-separated tags"
                class="form-control"
              />
            </div>
          </div>

          <div class="modal-footer border-secondary">
            <button type="button" class="btn btn-secondary" @click="handleCancel">
              Cancel
            </button>
            <button
              type="button"
              @click="handleSave"
              class="btn btn-primary"
              :disabled="!title.trim()"
            >
              {{ isEditMode ? 'Save Changes' : 'Create Slice' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Custom dark theme adjustments for Bootstrap modal */
.modal-content.bg-dark {
  background-color: #2a2a2a !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header.border-secondary,
.modal-footer.border-secondary {
  border-color: rgba(255, 255, 255, 0.1) !important;
}
</style>
