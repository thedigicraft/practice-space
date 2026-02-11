<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { saveCollection } from '@/services/db'
import { generateId } from '@/utils/helpers'
import type { Collection } from '@/types/models'
import { getAllCreditSuggestions, getCreditSuggestions, addCreditName } from '@/services/credits'
import { Modal } from 'bootstrap'

interface Props {
  show: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  created: [collection: Collection]
}>()

const name = ref('')
const description = ref('')
const color = ref('#4a9eff')
const isSaving = ref(false)
const owner = ref('')
const collaboratorsInput = ref('') // comma-separated
const collectionType = ref('')

const artistSuggestions = computed(() => getAllCreditSuggestions())
const collectionTypeSuggestions = computed(() => getCreditSuggestions('collectionTypes'))

const colors = [
  '#4a9eff', // Blue
  '#ff6b6b', // Red
  '#51cf66', // Green
  '#ffd93d', // Yellow
  '#a78bfa', // Purple
  '#f783ac', // Pink
  '#38bdf8', // Cyan
  '#fb923c', // Orange
]

const modalEl = ref<HTMLElement | null>(null)
let modalInstance: any | null = null

// Reset form and control modal when dialog opens/closes
watch(() => props.show, (show) => {
  if (show) {
    name.value = ''
    description.value = ''
    color.value = '#4a9eff'
    owner.value = ''
    collaboratorsInput.value = ''
    collectionType.value = ''
  }
  if (modalInstance) {
    if (show) modalInstance.show()
    else modalInstance.hide()
  }
})

onMounted(() => {
  if (modalEl.value) {
    modalInstance = new Modal(modalEl.value, { backdrop: 'static', keyboard: false })
    modalEl.value.addEventListener('hidden.bs.modal', () => {
      emit('close')
    })
    if (props.show) {
      modalInstance.show()
    }
  }
})

onUnmounted(() => {
  if (modalInstance) {
    modalInstance.dispose()
    modalInstance = null
  }
})

const handleSave = async () => {
  if (!name.value.trim()) {
    return
  }

  try {
    isSaving.value = true

    const collection: Collection = {
      id: generateId(),
      name: name.value.trim(),
      description: description.value.trim() || undefined,
      sliceIds: [],
      owner: owner.value.trim() || undefined,
      collaborators: collaboratorsInput.value
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
      type: collectionType.value.trim() || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      color: color.value,
    }

    // Persist new collection type into the pool for future suggestions
    if (collection.type) {
      addCreditName('collectionTypes', collection.type)
    }

    await saveCollection(collection)
    emit('created', collection)
    modalInstance?.hide()
  } catch (error) {
    console.error('Error creating collection:', error)
  } finally {
    isSaving.value = false
  }
}

const handleCancel = () => {
  modalInstance?.hide()
}
</script>

<template>
  <Teleport to="body">
    <div class="modal fade" tabindex="-1" ref="modalEl">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Create Collection</h5>
            <button type="button" class="btn-close" aria-label="Close" @click="handleCancel"></button>
          </div>

          <div class="modal-body">
            <div class="mb-3">
              <label for="collection-name" class="form-label">Collection Name *</label>
              <input id="collection-name" v-model="name" type="text" class="form-control" placeholder="Enter collection name" autofocus />
            </div>

            <div class="mb-3">
              <label for="collection-description" class="form-label">Description</label>
              <textarea id="collection-description" v-model="description" class="form-control" rows="3" placeholder="Add a description"></textarea>
            </div>

            <div class="mb-3">
              <label class="form-label">Color</label>
              <div class="color-picker">
                <button
                  v-for="c in colors"
                  :key="c"
                  @click="color = c"
                  class="color-option btn"
                  :class="{ selected: color === c }"
                  :style="{ background: c }"
                  type="button"
                >
                  <span v-if="color === c" class="check">✓</span>
                </button>
              </div>
            </div>

            <div class="mb-3">
              <label for="collection-owner" class="form-label">Owner</label>
              <input id="collection-owner" v-model="owner" type="text" class="form-control" placeholder="Select or type owner" list="artist-list" />
              <datalist id="artist-list">
                <option v-for="a in artistSuggestions" :key="a" :value="a">{{ a }}</option>
              </datalist>
            </div>

            <div class="mb-3">
              <label for="collection-collaborators" class="form-label">Collaborators (comma-separated)</label>
              <input id="collection-collaborators" v-model="collaboratorsInput" type="text" class="form-control" placeholder="e.g., Alice, Bob" list="artist-list" />
            </div>

            <div class="mb-0">
              <label for="collection-type" class="form-label">Collection Type</label>
              <input id="collection-type" v-model="collectionType" type="text" class="form-control" placeholder="Enter or select a type" list="collection-type-list" />
              <datalist id="collection-type-list">
                <option v-for="t in collectionTypeSuggestions" :key="t" :value="t">{{ t }}</option>
              </datalist>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" :disabled="isSaving" @click="handleCancel">Cancel</button>
            <button type="button" class="btn btn-primary" :disabled="!name.trim() || isSaving" @click="handleSave" :style="{ background: color, borderColor: color }">
              {{ isSaving ? 'Creating...' : 'Create Collection' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.color-picker {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 0.5rem;
}

.color-option {
  width: 100%;
  aspect-ratio: 1;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.selected {
  border-color: white;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
}

.check {
  font-weight: bold;
}

/* Keep color grid styling; Bootstrap provides base modal styles */
</style>