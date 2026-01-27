<template>
  <div class="library-view d-flex flex-column">
    <div class="library-content p-4">
      <div v-if="Object.keys(groupedSlices).length === 0" class="empty-state text-center py-5">
        <p>No slices in your library yet.</p>
        <p class="hint">Create slices from your audio sources to build your library!</p>
      </div>

      <div v-else class="library-grid container-fluid">
        <LibraryTypeSection
          v-for="(groups, sliceType) in groupedSlices"
          :key="sliceType"
          :slice-type="sliceType"
          :groups="groups"
          @open-group="openGroupedSlices"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, toRef } from 'vue'
import { useRouter } from 'vue-router'
import type { Slice, Source } from '@/types/models'
import LibraryTypeSection from '@/components/LibraryTypeSection.vue'
import { useSliceGrouping } from '@/composables/useSliceGrouping'

const router = useRouter()
const slices = inject<{ value: Slice[] }>('slices')
const sources = inject<{ value: Source[] }>('sources')

// Use slice grouping composable
const { groupedSlices } = useSliceGrouping({
  slices: toRef(() => slices?.value || []),
  sources: toRef(() => sources?.value || [])
})

const openGroupedSlices = (type: string, title: string) => {
  router.push({
    path: '/grouped-slices',
    query: { type, title }
  })
}
</script>

<style scoped>
.library-view {
  height: 100vh;
  background: #1a1a1a;
  color: #e0e0e0;
}

.library-content {
  overflow-y: auto;
}

.library-grid {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.empty-state {
  color: #888;
}

.hint {
  color: #666;
  font-size: 0.9rem;
}
</style>
