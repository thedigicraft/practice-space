<template>
  <div class="library-view d-flex flex-column">
    <PanelHeader title="Library">
      <template #center>
        <SearchBox
          v-model="searchQuery"
          placeholder="Filter library groups..."
          title="Filter library groups"
          aria-label="Filter library groups"
          :minWidth="340"
          @cleared="searchQuery=''"
        />
      </template>
    </PanelHeader>
    <div class="library-content p-4">
      <div v-if="Object.keys(groupedSlices).length === 0" class="empty-state text-center py-5">
        <p>No slices in your library yet.</p>
        <p class="hint">Create slices from your audio sources to build your library!</p>
      </div>

      <div v-else class="library-grid container-fluid">
        <LibraryTypeSection
          v-for="(groups, sliceType) in filteredGroupedSlices"
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
import { computed, inject, toRef, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Slice, Source } from '@/types/models'
import LibraryTypeSection from '@/components/LibraryTypeSection.vue'
import PanelHeader from '@/components/PanelHeader.vue'
import SearchBox from '@/components/SearchBox.vue'
import { useSliceGrouping } from '@/composables/useSliceGrouping'

const router = useRouter()
const slices = inject<{ value: Slice[] }>('slices')
const sources = inject<{ value: Source[] }>('sources')

// Use slice grouping composable
const { groupedSlices } = useSliceGrouping({
  slices: toRef(() => slices?.value || []),
  sources: toRef(() => sources?.value || [])
})

const searchQuery = ref('')

const filteredGroupedSlices = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return groupedSlices.value
  const result: Record<string, Record<string, { count: number; slices: any[]; locations: Set<string> }>> = {}
  for (const [sliceType, groups] of Object.entries(groupedSlices.value)) {
    const filteredGroups: Record<string, { count: number; slices: any[]; locations: Set<string> }> = {}
    for (const [title, group] of Object.entries(groups)) {
      const titleMatch = title.toLowerCase().includes(q)
      const locationMatch = Array.from(group.locations || []).some(loc => (loc || '').toLowerCase().includes(q))
      if (titleMatch || locationMatch) {
        filteredGroups[title] = group
      }
    }
    result[sliceType] = filteredGroups
  }
  return result
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
