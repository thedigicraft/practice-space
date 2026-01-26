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
          <tr
            v-for="slice in slices"
            :key="slice.id"
            :class="{ 'is-selected': slice.id === selectedSliceId }"
            @click="emit('selectSlice', slice)"
          >
            <td>{{ slice.title }}</td>
            <td>
              <span v-if="slice.composers && slice.composers.length > 0">
                <a
                  v-for="(composer, idx) in slice.composers"
                  :key="composer"
                  @click.stop="emit('filterByArtist', composer)"
                  class="artist-link"
                >
                  {{ composer }}<span v-if="idx < slice.composers.length - 1">, </span>
                </a>
              </span>
              <span v-else>—</span>
            </td>
            <td>
              <span v-if="slice.performers && slice.performers.length > 0">
                <a
                  v-for="(performer, idx) in slice.performers"
                  :key="performer"
                  @click.stop="emit('filterByArtist', performer)"
                  class="artist-link"
                >
                  {{ performer }}<span v-if="idx < slice.performers.length - 1">, </span>
                </a>
              </span>
              <span v-else>—</span>
            </td>
            <td>
              <a
                v-if="slice.type"
                @click.stop="emit('filterByType', slice.type)"
                class="type-link"
              >
                {{ slice.type }}
              </a>
              <span v-else>—</span>
            </td>
            <td>{{ formatTime(slice.endTime - slice.startTime) }}</td>
            <td>
              <button @click.stop="emit('seekToSlice', slice)" class="btn btn-sm btn-link" title="Jump to slice start"><i class="fas fa-step-backward"></i></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { Slice } from '../types/models'
import { formatTime } from '../utils/helpers'

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

<style scoped>
.slice-sidebar {
  width: 600px;
  background: #1e1e1e;
  border-left: 1px solid #333;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
}
.slice-sidebar.is-collapsed {
  width: 0;
  border-left: none;
  overflow: hidden;
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
.slices-table th:nth-child(1),
.slices-table td:nth-child(1) {
  width: 30%;
}
.slices-table th:nth-child(2),
.slices-table td:nth-child(2) {
  width: 20%;
  font-size: 0.85rem;
}
.slices-table th:nth-child(3),
.slices-table td:nth-child(3) {
  width: 20%;
  font-size: 0.85rem;
}
.slices-table th:nth-child(4),
.slices-table td:nth-child(4) {
  width: 15%;
  font-size: 0.85rem;
}
.slices-table th:nth-child(5),
.slices-table td:nth-child(5) {
  width: 15%;
  font-family: 'Courier New', monospace;
}
.slices-table th:nth-child(6),
.slices-table td:nth-child(6) {
  width: 10%;
  text-align: center;
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
.artist-link {
  color: #4a9eff;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
}
.artist-link:hover {
  color: #6bb3ff;
  text-decoration: underline;
}
.type-link {
  color: #9d4aff;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
}
.type-link:hover {
  color: #b36bff;
  text-decoration: underline;
}
</style>