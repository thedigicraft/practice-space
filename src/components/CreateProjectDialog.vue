<template>
  <div v-if="show">
    <div class="modal fade show" style="display: block;" tabindex="-1" role="dialog" aria-modal="true" @keydown.esc="$emit('close')">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">New Project</h5>
            <button type="button" class="btn-close" aria-label="Close" @click="$emit('close')"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Name</label>
              <input v-model="name" type="text" class="form-control" placeholder="Project name" />
            </div>
            <div class="mb-3">
              <label class="form-label">Description</label>
              <textarea v-model="description" class="form-control" rows="3" placeholder="Optional"></textarea>
            </div>
            <div class="mb-3">
              <label class="form-label">Color</label>
              <input v-model="color" type="color" class="form-control form-control-color" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="$emit('close')">Cancel</button>
            <button class="btn btn-primary" :disabled="!name.trim()" @click="create">Create</button>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade show"></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Project } from '@/types/models'

interface Props { show: boolean }
const props = defineProps<Props>()
const emit = defineEmits<{ created: [project: Omit<Project,'id'|'createdAt'|'updatedAt'>]; close: [] }>()

const name = ref('')
const description = ref('')
const color = ref('#9b59b6')

const create = () => {
  const now = Date.now()
  const project: Omit<Project,'id'|'createdAt'|'updatedAt'> = {
    name: name.value.trim(),
    description: description.value.trim() || undefined,
    sliceIds: [],
    groups: [],
    tabs: [],
    lyrics: [],
    color: color.value,
  }
  emit('created', project)
}
</script>

<style scoped>
.modal-dialog { max-width: 520px; }
</style>
