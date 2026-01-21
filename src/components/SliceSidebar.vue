<template>
  <aside class="slice-sidebar" :class="{ 'is-collapsed': isCollapsed }">
    <div class="sidebar-header">
      <h3 v-if="!isCollapsed">Slices ({{ slices.length }})</h3>
      <button @click="toggleCollapse" class="btn btn-sm btn-outline-secondary rounded-circle" style="width: 30px; height: 30px; padding: 0;">
        {{ isCollapsed ? '‹' : '›' }}
      </button>
    </div>
    <div v-if="!isCollapsed" class="sidebar-content">
      <div v-if="slices.length === 0" class="empty-state">
        No slices yet.
      </div>
      <table v-else class="slices-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Duration</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="slice in slices"
            :key="slice.id"
            :class="{ 'is-selected': slice.id === selectedSliceId }"
            @click="emit('selectSlice', slice)"
          >
            <td>{{ slice.title }}</td>
            <td>{{ formatDuration(slice.endTime - slice.startTime) }}</td>
            <td>
              <button @click.stop="emit('playSlice', slice)" class="btn btn-sm btn-link">▶</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Slice } from '../types/models'
import { formatTime } from '../utils/helpers'

interface Props {
  slices: Slice[]
  selectedSliceId: string | null
}

defineProps<Props>()

const emit = defineEmits<{
  selectSlice: [slice: Slice]
  playSlice: [slice: Slice]
}>()

const isCollapsed = ref(false)

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

const formatDuration = (seconds: number) => {
  return `${seconds.toFixed(2)}s`
}
</script>

<style scoped>
.slice-sidebar {
  width: 350px;
  background: #1e1e1e;
  border-left: 1px solid #333;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
}
.slice-sidebar.is-collapsed {
  width: 50px;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #333;
}
.sidebar-header h3 {
  margin: 0;
  font-size: 1.1rem;
  white-space: nowrap;
}

.sidebar-content {
  overflow-y: auto;
  flex: 1;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: #888;
}

.slices-table {
  width: 100%;
  border-collapse: collapse;
}
.slices-table th, .slices-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #333;
}
.slices-table th {
  font-size: 0.8rem;
  color: #888;
  text-transform: uppercase;
}
.slices-table tbody tr {
  cursor: pointer;
  transition: background 0.2s;
}
.slices-table tbody tr:hover {
  background: #2a2a2a;
}
.slices-table tbody tr.is-selected {
  background: #3a4a5a;
}
</style>