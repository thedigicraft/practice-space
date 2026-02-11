<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { saveCollection } from '@/services/db'
import type { Collection } from '@/types/models'
import { getAllCreditSuggestions, getCreditSuggestions, addCreditName } from '@/services/credits'
import { Modal } from 'bootstrap'

interface Props {
  show: boolean
  collection: Collection
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  updated: [collection: Collection]
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

const modalEl = ref<HTMLElement | null>(null)
let modalInstance: any | null = null

const populateFromCollection = () => {
  if (!props.collection) return
  name.value = props.collection.name || ''
  description.value = props.collection.description || ''
  color.value = props.collection.color || '#4a9eff'
  owner.value = props.collection.owner || ''
  collaboratorsInput.value = (props.collection.collaborators || []).join(', ')
  collectionType.value = props.collection.type || ''
}

// Sync fields and show/hide modal when prop changes
watch(
  () => props.show,
  (show) => {
    if (show) {
      populateFromCollection()
    }
    if (modalInstance) {
      if (show) modalInstance.show()
      else modalInstance.hide()
    }
  },
  { immediate: true }
)

// Also repopulate if the incoming collection changes while open
watch(
  () => props.collection,
  () => {
    if (props.show) populateFromCollection()
  }
)

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
  if (!name.value.trim()) return

  try {
    isSaving.value = true

    const updated: Collection = {
      ...props.collection,
      name: name.value.trim(),
      description: description.value.trim() || undefined,
      owner: owner.value.trim() || undefined,
      collaborators: collaboratorsInput.value
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
      type: collectionType.value.trim() || undefined,
      color: color.value,
      updatedAt: Date.now(),
    }

    if (updated.type) {
      addCreditName('collectionTypes', updated.type)
    }

    await saveCollection(updated)
    emit('updated', updated)
    modalInstance?.hide()
  } catch (error) {
    console.error('Error updating collection:', error)
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
            <h5 class="modal-title">Edit Collection</h5>
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
              <input type="color" v-model="color" class="form-control form-control-color" />
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
            <button type="button" class="btn btn-primary" :disabled="!name.trim() || isSaving" @click="handleSave">
              {{ isSaving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Minimal overrides if needed */
</style>