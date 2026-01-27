<template>
  <div class="batch-actions py-2 px-3 d-flex align-items-center justify-content-between gap-3">
    <div class="selection-info">
      {{ selectedCount }} selected
    </div>
    <div class="action-buttons d-flex gap-2">
      <button @click="$emit('selectAll')" class="btn btn-sm btn-outline-secondary">
        Select All
      </button>
      <button @click="$emit('clearSelection')" class="btn btn-sm btn-outline-secondary">
        Clear
      </button>
      <button 
        @click="$emit('export')" 
        class="btn btn-sm btn-success"
        :disabled="selectedCount === 0"
      >
        <i class="fas fa-download me-1"></i>Export ({{ selectedCount }})
      </button>
      <button 
        @click="$emit('delete')" 
        class="btn btn-sm btn-danger"
        :disabled="selectedCount === 0"
      >
        <i class="fas fa-trash me-1"></i>Delete ({{ selectedCount }})
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  selectedCount: number
}

defineProps<Props>()

defineEmits<{
  selectAll: []
  clearSelection: []
  export: []
  delete: []
}>()
</script>

<style scoped lang="scss">
.batch-actions {
  background: rgba(74, 158, 255, 0.1);
  border-bottom: 1px solid rgba(74, 158, 255, 0.2);
}

.selection-info {
  font-weight: 600;
  color: var(--bs-primary);
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}
</style>
