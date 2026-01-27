<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type { Slice } from '@/types/models'
import { Modal } from 'bootstrap'
import { getCreditSuggestions, getAllCreditSuggestions, addCreditNames, addCreditName } from '@/services/credits'

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
const composers = ref('')
const performers = ref('')
const type = ref('')
const composerSuggestions = ref<string[]>([])
const performerSuggestions = ref<string[]>([])
const typeSuggestions = ref<string[]>([])
const showComposerSuggestions = ref(false)
const showPerformerSuggestions = ref(false)
const showTypeSuggestions = ref(false)

const modalElement = ref<HTMLElement | null>(null)
let modalInstance: any | null = null

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
    composers.value = slice.composers?.join(', ') || ''
    performers.value = slice.performers?.join(', ') || ''
    type.value = slice.type || ''
  }
}, { immediate: true })

const handleComposerInput = () => {
  const query = composers.value.split(',').pop()?.trim() || ''
  composerSuggestions.value = getAllCreditSuggestions(query)
  showComposerSuggestions.value = composerSuggestions.value.length > 0
}

const selectComposerSuggestion = (suggestion: string) => {
  const parts = composers.value.split(',')
  parts[parts.length - 1] = suggestion
  composers.value = parts.join(', ') + ', '
  showComposerSuggestions.value = false
}

const handleComposerBlur = () => {
  // Delay hiding to allow click on suggestion
  window.setTimeout(() => {
    showComposerSuggestions.value = false
  }, 200)
}

const handlePerformerInput = () => {
  const query = performers.value.split(',').pop()?.trim() || ''
  performerSuggestions.value = getAllCreditSuggestions(query)
  showPerformerSuggestions.value = performerSuggestions.value.length > 0
}

const selectPerformerSuggestion = (suggestion: string) => {
  const parts = performers.value.split(',')
  parts[parts.length - 1] = suggestion
  performers.value = parts.join(', ') + ', '
  showPerformerSuggestions.value = false
}

const handlePerformerBlur = () => {
  window.setTimeout(() => {
    showPerformerSuggestions.value = false
  }, 200)
}

const handleTypeInput = () => {
  const query = type.value.trim()
  typeSuggestions.value = getCreditSuggestions('types', query)
  showTypeSuggestions.value = typeSuggestions.value.length > 0
}

const selectTypeSuggestion = (suggestion: string) => {
  type.value = suggestion
  showTypeSuggestions.value = false
}

const handleTypeBlur = () => {
  window.setTimeout(() => {
    showTypeSuggestions.value = false
  }, 200)
}

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

  const sliceComposers = composers.value
    .split(',')
    .map(c => c.trim())
    .filter(c => c.length > 0)

  const slicePerformers = performers.value
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0)

  // Save composer names to global credits
  if (sliceComposers.length > 0) {
    addCreditNames('composers', sliceComposers)
  }
  
  // Save performer names to global credits
  if (slicePerformers.length > 0) {
    addCreditNames('performers', slicePerformers)
  }

  // Save type to pool if it has a value
  if (type.value.trim()) {
    addCreditName('types', type.value.trim())
  }

  if (isEditMode.value && props.existingSlice) {
    // Update existing slice
    const updatedSlice: Slice = {
      ...props.existingSlice,
      title: title.value.trim(),
      notes: notes.value.trim() || undefined,
      tags: sliceTags.length > 0 ? sliceTags : undefined,
      composers: sliceComposers.length > 0 ? sliceComposers : undefined,
      performers: slicePerformers.length > 0 ? slicePerformers : undefined,
      type: type.value.trim() || undefined,
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
      composers: sliceComposers.length > 0 ? sliceComposers : undefined,
      performers: slicePerformers.length > 0 ? slicePerformers : undefined,
      type: type.value.trim() || undefined,
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

            <div class="mb-3 position-relative">
              <label for="slice-composers" class="form-label">Composers</label>
              <input
                id="slice-composers"
                v-model="composers"
                @input="handleComposerInput"
                @focus="handleComposerInput"
                @blur="handleComposerBlur"
                type="text"
                placeholder="Comma-separated composer names"
                class="form-control"
              />
              <div v-if="showComposerSuggestions && composerSuggestions.length > 0" class="autocomplete-dropdown">
                <div
                  v-for="suggestion in composerSuggestions"
                  :key="suggestion"
                  @mousedown="selectComposerSuggestion(suggestion)"
                  class="autocomplete-item"
                >
                  {{ suggestion }}
                </div>
              </div>
              <small class="form-text text-muted">Previously used names will appear as suggestions</small>
            </div>

            <div class="mb-3 position-relative">
              <label for="slice-performers" class="form-label">Performers</label>
              <input
                id="slice-performers"
                v-model="performers"
                @input="handlePerformerInput"
                @focus="handlePerformerInput"
                @blur="handlePerformerBlur"
                type="text"
                placeholder="Comma-separated performer names"
                class="form-control"
              />
              <div v-if="showPerformerSuggestions && performerSuggestions.length > 0" class="autocomplete-dropdown">
                <div
                  v-for="suggestion in performerSuggestions"
                  :key="suggestion"
                  @mousedown="selectPerformerSuggestion(suggestion)"
                  class="autocomplete-item"
                >
                  {{ suggestion }}
                </div>
              </div>
              <small class="form-text text-muted">Previously used names will appear as suggestions</small>
            </div>

            <div class="mb-3 position-relative">
              <label for="slice-type" class="form-label">Type</label>
              <input
                id="slice-type"
                v-model="type"
                @input="handleTypeInput"
                @focus="handleTypeInput"
                @blur="handleTypeBlur"
                type="text"
                placeholder="e.g., Etude, Scale, Exercise"
                class="form-control"
              />
              <div v-if="showTypeSuggestions && typeSuggestions.length > 0" class="autocomplete-dropdown">
                <div
                  v-for="suggestion in typeSuggestions"
                  :key="suggestion"
                  @mousedown="selectTypeSuggestion(suggestion)"
                  class="autocomplete-item"
                >
                  {{ suggestion }}
                </div>
              </div>
              <small class="form-text text-muted">Previously used types will appear as suggestions</small>
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

/* Autocomplete dropdown */
.autocomplete-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  margin-top: 2px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

.autocomplete-item {
  padding: 8px 12px;
  cursor: pointer;
  color: #e0e0e0;
  transition: background-color 0.15s;
}

.autocomplete-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}
</style>
