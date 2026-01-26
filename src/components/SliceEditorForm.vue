<template>
  <div v-if="slice" class="slice-editor-form xp-4">
    
    <div class="form-grid">
      <div class="form-group">
        <label for="edit-title" class="form-label visually-hidden">Title</label>
        <input
          id="edit-title"
          v-model="editableSlice.title"
          type="text"
          placeholder="Slice title"
          class="form-control form-control-sm"
          @keyup.enter="save"
        />
      </div>

      <div class="form-group">
        <label for="edit-composers" class="form-label visually-hidden">Composers</label>
        <div class="position-relative">
          <input
            id="edit-composers"
            v-model="composersInput"
            @input="handleComposerInput"
            @focus="handleComposerInput"
            @blur="handleComposerBlur"
            type="text"
            placeholder="Comma-separated composer names"
            class="form-control form-control-sm"
            @keyup.enter="save"
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
        </div>
      </div>

      <div class="form-group">
        <label for="edit-performers" class="form-label visually-hidden">Performers</label>
        <div class="position-relative">
          <input
            id="edit-performers"
            v-model="performersInput"
            @input="handlePerformerInput"
            @focus="handlePerformerInput"
            @blur="handlePerformerBlur"
            type="text"
            placeholder="Comma-separated performer names"
            class="form-control form-control-sm"
            @keyup.enter="save"
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
        </div>
      </div>

      <div class="form-group">
        <label for="edit-type" class="form-label visually-hidden">Type</label>
        <div class="position-relative">
          <input
            id="edit-type"
            v-model="editableSlice.type"
            @input="handleTypeInput"
            @focus="handleTypeInput"
            @blur="handleTypeBlur"
            type="text"
            placeholder="e.g., Etude, Scale, Exercise"
            class="form-control form-control-sm"
            @keyup.enter="save"
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
        </div>
      </div>

      <div class="form-group full-width">
        <label for="edit-notes" class="form-label visually-hidden">Notes</label>
        <textarea
          id="edit-notes"
          v-model="editableSlice.notes"
          placeholder="Add notes about this slice"
          class="form-control form-control-sm"
          rows="3"
          @keyup.ctrl.enter="save"
        ></textarea>
      </div>

      <div class="form-group">
        <label for="edit-tags" class="form-label visually-hidden">Tags</label>
        <input
          id="edit-tags"
          v-model="tagsInput"
          type="text"
          placeholder="Comma-separated tags"
          class="form-control form-control-sm"
          @keyup.enter="save"
        />
      </div>
    </div>

    <div v-if="!hideSaveButton" class="form-actions">
      <button @click="save" class="btn btn-success btn-sm">
        Save Changes
      </button>
      <button @click="$emit('cancel')" class="btn btn-secondary btn-sm">
        Cancel
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, withDefaults } from 'vue'
import type { Slice } from '@/types/models'
import { getCreditSuggestions, getAllCreditSuggestions, addCreditNames, addCreditName } from '@/services/credits'

interface Props {
  slice: Slice | null
  selection?: { startTime: number; endTime: number } | null
  hideSaveButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  hideSaveButton: false
})

const emit = defineEmits<{
  update: [slice: Slice]
  cancel: []
}>()

const editableSlice = ref<Partial<Slice>>({})
const tagsInput = ref('')
const composersInput = ref('')
const performersInput = ref('')
const typeSuggestions = ref<string[]>([])
const composerSuggestions = ref<string[]>([])
const performerSuggestions = ref<string[]>([])
const showTypeSuggestions = ref(false)
const showComposerSuggestions = ref(false)
const showPerformerSuggestions = ref(false)

watch(() => props.slice, (newSlice) => {
  if (newSlice) {
    editableSlice.value = { ...newSlice }
    tagsInput.value = newSlice.tags?.join(', ') || ''
    composersInput.value = newSlice.composers?.join(', ') || ''
    performersInput.value = newSlice.performers?.join(', ') || ''
  }
}, { immediate: true })

const handleComposerInput = () => {
  const query = composersInput.value.split(',').pop()?.trim() || ''
  composerSuggestions.value = getAllCreditSuggestions(query)
  showComposerSuggestions.value = composerSuggestions.value.length > 0
}

const selectComposerSuggestion = (suggestion: string) => {
  const parts = composersInput.value.split(',')
  parts[parts.length - 1] = suggestion
  composersInput.value = parts.join(', ') + ', '
  showComposerSuggestions.value = false
}

const handleComposerBlur = () => {
  window.setTimeout(() => {
    showComposerSuggestions.value = false
  }, 200)
}

const handlePerformerInput = () => {
  const query = performersInput.value.split(',').pop()?.trim() || ''
  performerSuggestions.value = getAllCreditSuggestions(query)
  showPerformerSuggestions.value = performerSuggestions.value.length > 0
}

const selectPerformerSuggestion = (suggestion: string) => {
  const parts = performersInput.value.split(',')
  parts[parts.length - 1] = suggestion
  performersInput.value = parts.join(', ') + ', '
  showPerformerSuggestions.value = false
}

const handlePerformerBlur = () => {
  window.setTimeout(() => {
    showPerformerSuggestions.value = false
  }, 200)
}

const handleTypeInput = () => {
  const query = editableSlice.value.type?.trim() || ''
  typeSuggestions.value = getCreditSuggestions('types', query)
  showTypeSuggestions.value = typeSuggestions.value.length > 0
}

const selectTypeSuggestion = (suggestion: string) => {
  editableSlice.value.type = suggestion
  showTypeSuggestions.value = false
}

const handleTypeBlur = () => {
  window.setTimeout(() => {
    showTypeSuggestions.value = false
    // Save type to pool if it has a value
    if (editableSlice.value.type?.trim()) {
      addCreditName('types', editableSlice.value.type.trim())
    }
  }, 200)
}

const save = () => {
  if (!props.slice) return

  const sliceComposers = composersInput.value
    .split(',')
    .map(c => c.trim())
    .filter(Boolean)

  const slicePerformers = performersInput.value
    .split(',')
    .map(p => p.trim())
    .filter(Boolean)

  if (sliceComposers.length > 0) {
    addCreditNames('composers', sliceComposers)
  }
  
  if (slicePerformers.length > 0) {
    addCreditNames('performers', slicePerformers)
  }

  // Save type to pool if it has a value
  if (editableSlice.value.type?.trim()) {
    addCreditName('types', editableSlice.value.type.trim())
  }

  const updatedSlice: Slice = {
    ...props.slice,
    ...editableSlice.value,
    startTime: props.selection?.startTime ?? props.slice.startTime,
    endTime: props.selection?.endTime ?? props.slice.endTime,
    tags: tagsInput.value.split(',').map(t => t.trim()).filter(Boolean),
    composers: sliceComposers.length > 0 ? sliceComposers : undefined,
    performers: slicePerformers.length > 0 ? slicePerformers : undefined,
    type: editableSlice.value.type?.trim() || undefined,
    updatedAt: Date.now(),
  }
  
  emit('update', updatedSlice)
}

defineExpose({
  triggerSave: save
})
</script>

<style scoped>
.slice-editor-form {
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 1.5rem;
  /* margin-top: 1rem; */
}

.editor-title {
  font-size: 1.1rem;
  margin-bottom: 1.25rem;
  color: #e0e0e0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: #aaa;
}

/* .form-control {
  background: #2a2a2a;
  border: 1px solid #444;
  color: #e0e0e0;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  font-size: 0.9rem;
} */

.form-control:focus {
  outline: none;
  border-color: #0d6efd;
  box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
}

textarea.form-control {
  resize: vertical;
  min-height: 80px;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
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
  font-size: 0.875rem;
  transition: background-color 0.15s;
}

.autocomplete-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.position-relative {
  position: relative;
}
</style>
