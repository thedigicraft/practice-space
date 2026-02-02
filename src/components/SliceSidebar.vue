<template>
  <aside class="slice-sidebar" :class="{ 'is-collapsed': isCollapsed }">
    <div v-if="!isCollapsed" class="sidebar-content flex-fill overflow-auto">
      <div v-if="slices.length === 0" class="empty-state">
        No slices yet.
      </div>
      <table v-else class="app-table table table-hover table-striped">
        <thead>
          <tr>
            <th>Title</th>
            <th>Composer</th>
            <th>Performer</th>
            <th>Type</th>
            <th>Duration</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <SliceTableRow
            v-for="slice in slices"
            :key="slice.id"
            :slice="slice"
            :is-selected="slice.id === selectedSliceId"
            @select="emit('selectSlice', slice)"
            @seek-to="emit('seekToSlice', slice)"
            @filter-artist="emit('filterByArtist', $event)"
            @filter-type="emit('filterByType', $event)"
          />
        </tbody>
      </table>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { Slice } from '../types/models'
import SliceTableRow from './SliceTableRow.vue'

interface Props {
  slices: Slice[]
  selectedSliceId: string | null
  isCollapsed: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  selectSlice: [slice: Slice]
  seekToSlice: [slice: Slice]
  filterByArtist: [artistName: string]
  filterByType: [type: string]
}>()
</script>

<style scoped lang="scss">
.slice-sidebar {
  width: 600px;
  border-left: 1px solid #333;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;

  &.is-collapsed {
    width: 0;
    border-left: none;
    overflow: hidden;
  }
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

/* Table layout now unified via global .app-table styles */
</style>