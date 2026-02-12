<template>
  <div v-if="show">
    <div class="modal fade show" style="display: block;" tabindex="-1" role="dialog" aria-modal="true" @keydown.esc="$emit('close')">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Edit Project</h5>
            <button type="button" class="btn-close" aria-label="Close" @click="$emit('close')"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Name</label>
              <input v-model="editable.name" type="text" class="form-control" />
            </div>
            <div class="mb-3">
              <label class="form-label">Description</label>
              <textarea v-model="editable.description" class="form-control" rows="3"></textarea>
            </div>
            <div class="mb-3">
              <label class="form-label">Color</label>
              <input v-model="editable.color" type="color" class="form-control form-control-color" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="$emit('close')">Cancel</button>
            <button class="btn btn-primary" @click="save">Save</button>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade show"></div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { Project } from '@/types/models'

interface Props { show: boolean; project: Project }
const props = defineProps<Props>()
const emit = defineEmits<{ updated: [project: Project]; close: [] }>()

const editable = reactive({ ...props.project })

const save = () => {
  emit('updated', { ...editable, updatedAt: Date.now() })
}
</script>

<style scoped>
.modal-dialog { max-width: 520px; }
</style>
