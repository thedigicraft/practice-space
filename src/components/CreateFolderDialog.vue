<script setup lang="ts">
import { ref, watch } from 'vue'
import { saveFolder } from '@/services/db'
import { generateId } from '@/utils/helpers'
import type { SliceFolder } from '@/types/models'

interface Props {
  show: boolean
  parentId?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  created: [folder: SliceFolder]
}>()

const name = ref('')
const isSaving = ref(false)

// Reset form when dialog opens
watch(() => props.show, (show) => {
  if (show) {
    name.value = ''
  }
})

const handleSave = async () => {
  if (!name.value.trim()) {
    return
  }

  try {
    isSaving.value = true

    const folder: SliceFolder = {
      id: generateId(),
      name: name.value.trim(),
      parentId: props.parentId,
      sliceIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    await saveFolder(folder)
    emit('created', folder)
    emit('close')
  } catch (error) {
    console.error('Error creating folder:', error)
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
          <h2>Create Folder</h2>
          <button class="btn-close" @click="handleCancel">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label for="folder-name">Folder Name *</label>
            <input
              id="folder-name"
              v-model="name"
              type="text"
              placeholder="Enter folder name"
              class="form-input"
              autofocus
              @keyup.enter="handleSave"
            />
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
          >
            {{ isSaving ? 'Creating...' : 'Create Folder' }}
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
  max-width: 400px;
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
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.9rem;
}

.form-input {
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

.form-input:focus {
  outline: none;
  border-color: #4a9eff;
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
