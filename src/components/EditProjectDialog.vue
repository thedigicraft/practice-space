<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { saveProject } from '@/services/db'
import type { Project } from '@/types/models'
import { getAllCreditSuggestions, getCreditSuggestions, addCreditName } from '@/services/credits'
import { Modal } from 'bootstrap'

interface Props {
  show: boolean
  project: Project
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  updated: [project: Project]
}>()

const name = ref('')
const description = ref('')
const color = ref('#4a9eff')
const isSaving = ref(false)
const owner = ref('')
const collaboratorsInput = ref('') // comma-separated
const projectType = ref('')

const artistSuggestions = computed(() => getAllCreditSuggestions())
const projectTypeSuggestions = computed(() => getCreditSuggestions('projectTypes'))

const modalEl = ref<HTMLElement | null>(null)
let modalInstance: any | null = null

const populateFromProject = () => {
  if (!props.project) return
  name.value = props.project.name || ''
  description.value = props.project.description || ''
  color.value = props.project.color || '#4a9eff'
  owner.value = props.project.owner || ''
  collaboratorsInput.value = (props.project.collaborators || []).join(', ')
  projectType.value = props.project.type || ''
}

// Sync fields and show/hide modal when prop changes
watch(
  () => props.show,
  (show) => {
    if (show) {
      populateFromProject()
    }
    if (modalInstance) {
      if (show) modalInstance.show()
      else modalInstance.hide()
    }
  },
  { immediate: true }
)

// Also repopulate if the incoming project changes while open
watch(
  () => props.project,
  () => {
    if (props.show) populateFromProject()
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

    const updated: Project = {
      ...props.project,
      name: name.value.trim(),
      description: description.value.trim() || undefined,
      owner: owner.value.trim() || undefined,
      collaborators: collaboratorsInput.value
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
      type: projectType.value.trim() || undefined,
      color: color.value,
      updatedAt: Date.now(),
    }

    if (updated.type) {
      addCreditName('projectTypes', updated.type)
    }

    await saveProject(updated)
    emit('updated', updated)
    modalInstance?.hide()
  } catch (error) {
    console.error('Error updating project:', error)
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
            <h5 class="modal-title">Edit Project</h5>
            <button type="button" class="btn-close" aria-label="Close" @click="handleCancel"></button>
          </div>

          <div class="modal-body">
            <div class="mb-3">
              <label for="project-name" class="form-label">Project Name *</label>
              <input id="project-name" v-model="name" type="text" class="form-control" placeholder="Enter project name" autofocus />
            </div>

            <div class="mb-3">
              <label for="project-description" class="form-label">Description</label>
              <textarea id="project-description" v-model="description" class="form-control" rows="3" placeholder="Add a description"></textarea>
            </div>

            <div class="mb-3">
              <label class="form-label">Color</label>
              <input type="color" v-model="color" class="form-control form-control-color" />
            </div>

            <div class="mb-3">
              <label for="project-owner" class="form-label">Owner</label>
              <input id="project-owner" v-model="owner" type="text" class="form-control" placeholder="Select or type owner" list="artist-list" />
              <datalist id="artist-list">
                <option v-for="a in artistSuggestions" :key="a" :value="a">{{ a }}</option>
              </datalist>
            </div>

            <div class="mb-3">
              <label for="project-collaborators" class="form-label">Collaborators (comma-separated)</label>
              <input id="project-collaborators" v-model="collaboratorsInput" type="text" class="form-control" placeholder="e.g., Alice, Bob" list="artist-list" />
            </div>

            <div class="mb-0">
              <label for="project-type" class="form-label">Project Type</label>
              <input id="project-type" v-model="projectType" type="text" class="form-control" placeholder="Enter or select a type" list="project-type-list" />
              <datalist id="project-type-list">
                <option v-for="t in projectTypeSuggestions" :key="t" :value="t">{{ t }}</option>
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
