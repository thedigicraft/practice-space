<template>
  <div class="slices-list">
    <SliceCard
      v-for="slice in slices"
      :key="slice.id"
      :slice="slice"
      :source="source"
      :is-playing="isPlaying"
      :currently-playing-slice-id="currentlyPlayingSliceId"
      :current-time="currentTime"
      :is-selected="slice.id === selectedSliceId"
      @play-slice="emit('playSlice', $event)"
      @select-slice="emit('selectSlice', $event)"
      @edit-slice="emit('editSlice', $event)"
      @delete-slice="emit('deleteSlice', $event)"
      @update-slice="emit('updateSlice', $event)"
      @toggle-play-pause="emit('togglePlayPause')"
    />
  </div>
</template>

<script setup lang="ts">
import SliceCard from './SliceCard.vue'
import type { Slice, Source } from '../types/models'

interface Props {
  slices: Slice[]
  source: Source | null
  isPlaying: boolean
  currentlyPlayingSliceId: string | null
  currentTime: number
  selectedSliceId: string | null
}

defineProps<Props>()

const emit = defineEmits<{
  playSlice: [slice: Slice]
  selectSlice: [slice: Slice]
  editSlice: [slice: Slice]
  deleteSlice: [sliceId: string]
  updateSlice: [slice: Slice]
  togglePlayPause: []
}>()
</script>

<style scoped>
.slices-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>