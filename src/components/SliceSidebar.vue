<template>
  <aside class="slice-sidebar" :class="{ 'is-collapsed': isCollapsed }">
    <div v-if="!isCollapsed" class="sidebar-content p-4">
      <div v-if="slices.length === 0" class="empty-state">
        No slices yet.
      </div>
      <table v-else class="slices-table">
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

.slices-table {
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #333;
  }

  th {
    font-size: 0.8rem;
    color: #888;
    text-transform: uppercase;

    &:nth-child(1) { width: 30%; }
    &:nth-child(2) { width: 20%; font-size: 0.85rem; }
    &:nth-child(3) { width: 20%; font-size: 0.85rem; }
    &:nth-child(4) { width: 15%; font-size: 0.85rem; }
    &:nth-child(5) { width: 15%; font-family: 'Courier New', monospace; }
    &:nth-child(6) { width: 10%; text-align: center; }
  }

  td {
    &:nth-child(1) { width: 30%; }
    &:nth-child(2) { width: 20%; font-size: 0.85rem; }
    &:nth-child(3) { width: 20%; font-size: 0.85rem; }
    &:nth-child(4) { width: 15%; font-size: 0.85rem; }
    &:nth-child(5) { width: 15%; font-family: 'Courier New', monospace; }
    &:nth-child(6) { width: 10%; text-align: center; }
  }
}
</style>