<template>
  <tr
    :class="{ 'is-selected': isSelected }"
    @click="$emit('select')"
  >
    <td class="col-title">{{ slice.title }}</td>
    <td class="col-composers">
      <span v-if="slice.composers && slice.composers.length > 0">
        <a
          v-for="(composer, idx) in slice.composers"
          :key="composer"
          @click.stop="$emit('filterArtist', composer)"
          class="artist-link"
        >
          {{ composer }}<span v-if="idx < slice.composers.length - 1">, </span>
        </a>
      </span>
      <span v-else>—</span>
    </td>
    <td class="col-performers">
      <span v-if="slice.performers && slice.performers.length > 0">
        <a
          v-for="(performer, idx) in slice.performers"
          :key="performer"
          @click.stop="$emit('filterArtist', performer)"
          class="artist-link"
        >
          {{ performer }}<span v-if="idx < slice.performers.length - 1">, </span>
        </a>
      </span>
      <span v-else>—</span>
    </td>
    <td class="col-type">
      <a
        v-if="slice.type"
        @click.stop="$emit('filterType', slice.type)"
        class="type-link"
      >
        {{ slice.type }}
      </a>
      <span v-else>—</span>
    </td>
    <td class="col-duration">{{ formatTime(slice.endTime - slice.startTime) }}</td>
    <td class="col-actions">
      <button 
        @click.stop="$emit('seekTo')" 
        class="btn btn-sm btn-link" 
        title="Jump to slice start"
      >
        <i class="fas fa-step-backward"></i>
      </button>
    </td>
  </tr>
</template>

<script setup lang="ts">
import type { Slice } from '@/types/models'
import { formatTime } from '@/utils/helpers'

interface Props {
  slice: Slice
  isSelected: boolean
}

defineProps<Props>()

defineEmits<{
  select: []
  seekTo: []
  filterArtist: [artist: string]
  filterType: [type: string]
}>()
</script>

<style scoped lang="scss">
tr {
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background: rgba(var(--bs-primary-rgb), 0.1);
  }

  &.is-selected {
    background: rgba(var(--bs-primary-rgb), 0.2);
    border-left: 3px solid var(--bs-primary);
  }
}

td {
  padding: 0.75rem;
  vertical-align: middle;
}

.artist-link,
.type-link {
  color: var(--bs-link-color);
  cursor: pointer;
  text-decoration: none;
  transition: color 0.2s;

  &:hover {
    color: var(--bs-link-hover-color);
    text-decoration: underline;
  }
}
</style>
