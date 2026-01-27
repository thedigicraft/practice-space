<template>
  <div class="library-view d-flex flex-column">
    <div class="library-content p-4">
      <div v-if="Object.keys(groupedSlices).length === 0" class="empty-state text-center py-5">
        <p>No slices in your library yet.</p>
        <p class="hint">Create slices from your audio sources to build your library!</p>
      </div>

      <div v-else class="library-grid container-fluid">
        <div v-for="(groups, sliceType) in groupedSlices" :key="sliceType" class="library-type-section">
          <h2 class="type-header d-flex justify-content-start align-items-center gap-2">
                          <div class="item-icon d-flex align-items-center justify-content-center">
                <i :class="getTypeIcon(sliceType)"></i>
              </div>
              {{ formatTypeName(sliceType) }}</h2>
          <div class="grouped-items">
            <div
              v-for="(sliceGroup, title) in groups"
              :key="`${sliceType}-${title}`"
              class="grouped-item d-flex gap-3"
              @click="openGroupedSlices(sliceType, title)"
            >

              <div class="item-info flex-fill">
                <h3 class="item-title d-flex align-items-center gap-2">
                  {{ title }}
                  <span class="badge bg-primary rounded-pill">{{ sliceGroup.count }}</span>
                </h3>
                <p v-if="sliceGroup.locations.size > 0" class="item-locations">
                  <i class="fas fa-map-marker-alt me-1"></i>
                  {{ Array.from(sliceGroup.locations).join(', ') }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import type { Slice, Source } from '@/types/models'

const router = useRouter()
const slices = inject<{ value: Slice[] }>('slices')
const sources = inject<{ value: Source[] }>('sources')

const groupedSlices = computed(() => {
  const groups: Record<string, Record<string, { count: number; slices: Slice[]; locations: Set<string> }>> = {}
  
  slices?.value.forEach(slice => {
    if (!slice.type || !slice.title) return
    
    if (!groups[slice.type]) {
      groups[slice.type] = {}
    }
    
    if (!groups[slice.type][slice.title]) {
      groups[slice.type][slice.title] = { count: 0, slices: [], locations: new Set() }
    }
    
    groups[slice.type][slice.title].count++
    groups[slice.type][slice.title].slices.push(slice)
    
    const source = sources?.value.find(s => s.id === slice.audioFileId)
    if (source?.location) {
      groups[slice.type][slice.title].locations.add(source.location)
    }
  })
  
  return groups
})

const formatTypeName = (type: string) => {
  return type.charAt(0).toUpperCase() + type.slice(1) + 's'
}

const getTypeIcon = (type: string) => {
  const icons: Record<string, string> = {
    'song': 'fas fa-music',
    'etude': 'fas fa-graduation-cap',
    'scale': 'fas fa-sliders-h',
    'exercise': 'fas fa-dumbbell',
    'warm-up': 'fas fa-fire',
    'technique': 'fas fa-tools',
  }
  return icons[type.toLowerCase()] || 'fas fa-wave-square'
}

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



.library-type-section {
  margin-bottom: 3rem;
}

.type-header {
  font-size: 1.5rem;
  color: #4a9eff;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #353535;
}

.grouped-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.grouped-item {
  background: #252525;
  border: 1px solid #353535;
  border-radius: 8px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s;
}

.grouped-item:hover {
  border-color: #4a9eff;
  box-shadow: 0 4px 12px rgba(74, 158, 255, 0.2);
  transform: translateY(-2px);
}

.item-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  color: #4a9eff;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.item-info {
  min-width: 0;
}

.item-title {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  margin: 0;
  font-size: 0.8rem;
  color: #888;
}

.item-locations {
  margin: 0.25rem 0 0 0;
  font-size: 0.75rem;
  color: #9d4aff;
}

.empty-state {
  color: #888;
}

.hint {
  color: #666;
  font-size: 0.9rem;
}
</style>
