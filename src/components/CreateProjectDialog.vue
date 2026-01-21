<script setup lang="ts">
import { ref, watch } from 'vue'
import { saveProject } from '@/services/db'
import { generateId } from '@/utils/helpers'
import type { Project } from '@/types/models'

interface Props {
  show: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  created: [project: Project]
}>()

const name = ref('')
const description = ref('')
const color = ref('#4a9eff')
const isSaving = ref(false)

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

// Reset form when dialog opens
watch(() => props.show, (show) => {
  if (show) {
    name.value = ''
    description.value = ''
    color.value = '#4a9eff'
  }
})

const handleSave = async () => {
  if (!name.value.trim()) {
    return
  }

  try {
    isSaving.value = true

    const project: Project = {
      id: generateId(),
      name: name.value.trim(),
      description: description.value.trim() || undefined,
      sliceIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      color: color.value,
    }

    await saveProject(project)
    emit('created', project)
    emit('close')
  } catch (error) {
    console.error('Error creating project:', error)
  } finally {
    isSaving.value = false
  }
}

const handleCancel = () => {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click="handleCancel">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header">
          <h2>Create Project</h2>
          <button class="btn-close" @click="handleCancel">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label for="project-name">Project Name *</label>
            <input
              id="project-name"
              v-model="name"
              type="text"
              placeholder="Enter project name"
              class="form-input"
              autofocus
            />
          </div>

          <div class="form-group">
            <label for="project-description">Description</label>
            <textarea
              id="project-description"
              v-model="description"
              placeholder="Add a description"
              class="form-textarea"
              rows="3"
            ></textarea>
          </div>

          <div class="form-group">
            <label>Color</label>
            <div class="color-picker">
              <button
                v-for="c in colors"
                :key="c"
                @click="color = c"
                class="color-option"
                :class="{ selected: color === c }"
                :style="{ background: c }"
              >
                <span v-if="color === c" class="check">✓</span>
              </button>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="handleCancel" class="btn-secondary" :disabled="isSaving">
            Cancel
          </button>
          <button
            @click="handleSave"
            class="btn-primary"
            :disabled="!name.trim() || isSaving"
            :style="{ background: color, borderColor: color }"
          >
            {{ isSaving ? 'Creating...' : 'Create Project' }}
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
  color: white;
}

.btn-primary:hover:not(:disabled) {
  filter: brightness(0.9);
}

.btn-secondary:disabled,
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
