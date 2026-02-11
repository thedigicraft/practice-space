<template>
  <aside class="sidebar-slice-browser d-flex flex-column">
    <div class="sidebar-header d-flex align-items-end pe-3 pt-2 pb-0 ps-0">
      <div class="tabs d-flex gap-0 flex-grow-1">
        <button
          class="btn btn-sm tab-btn"
          :class="activeTab === 'slices' ? 'btn-primary active' : 'btn-outline-secondary'"
          @click="activeTab = 'slices'"
          title="Slices"
          aria-label="Show slices"
        >
          <i class="fas fa-scissors me-1"></i>
          <span class="tab-label">SLICES</span>
        </button>
        <button
          class="btn btn-sm tab-btn"
          :class="activeTab === 'library' ? 'btn-primary active' : 'btn-outline-secondary'"
          @click="activeTab = 'library'"
          title="Library"
          aria-label="Show library groups"
        >
          <i class="fas fa-layer-group me-1"></i>
          <span class="tab-label">LIBRARY</span>
        </button>
      </div>
      <button
        class="btn btn-sm btn-outline-secondary toggle-btn ms-2"
        :class="{ active: hideAssigned }"
        :aria-pressed="hideAssigned ? 'true' : 'false'"
        @click="hideAssigned = !hideAssigned"
        :title="hideAssigned ? 'Show all items' : 'Hide items already in a project'"
        aria-label="Toggle hide assigned items"
      >
        <i :class="hideAssigned ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
      </button>
    </div>

    <div class="content flex-fill overflow-auto px-3 pt-2 pb-3">
      <!-- Slices Tab -->
      <div v-if="activeTab === 'slices'" class="d-flex flex-column gap-2">
        <div
          v-for="slice in filteredSlices"
          :key="slice.id"
          class="draggable-card"
          draggable="true"
          @dragstart="onDragStartSlices([slice.id], $event)"
        >
          <SliceListItem
            :slice="slice"
            :sourceName="getSourceName(slice.audioFileId)"
            :showViewSource="false"
          >
            <template #footer>
              <div v-if="(projectsBySliceId[slice.id]?.length || 0) > 0" class="project-badges">
                <span
                  v-for="p in projectsBySliceId[slice.id]"
                  :key="p.id"
                  class="badge rounded-pill me-1 mb-1"
                  :style="badgeStyleForProject(p)"
                  :title="p.name"
                >{{ p.name }}</span>
              </div>
            </template>
          </SliceListItem>
        </div>
      </div>

      <!-- Library (Grouped) Tab -->
      <div v-else class="d-flex flex-column gap-3">
        <div v-for="type in groupTypesFiltered" :key="type">
          <div class="type-header d-flex align-items-center justify-content-between text-uppercase text-secondary small mb-2">
            <div>{{ type }}</div>
            <button
              class="btn btn-sm btn-outline-secondary collapse-btn"
              @click="toggleTypeCollapse(type)"
              :aria-expanded="!isTypeCollapsed(type)"
              :title="isTypeCollapsed(type) ? 'Expand' : 'Collapse'"
            >
              <i :class="isTypeCollapsed(type) ? 'fas fa-chevron-down' : 'fas fa-chevron-up'"></i>
            </button>
          </div>
          <div class="d-flex flex-column gap-2" v-show="!isTypeCollapsed(type)">
            <div
              v-for="item in filteredGroups[type]"
              :key="item.title"
              class="draggable-card"
              draggable="true"
              @dragstart="onDragStartGroup(item, $event)"
            >
              <LibraryItemCard
                :title="item.title"
                :count="item.count"
                :locations="item.locations"
              >
                <template #footer>
                  <div v-if="projectsForGroup(item.sliceIds).length > 0" class="project-badges">
                    <span
                      v-for="p in projectsForGroup(item.sliceIds)"
                      :key="p.id"
                      class="badge rounded-pill me-1 mb-1"
                      :style="badgeStyleForProject(p)"
                      :title="p.name"
                    >{{ p.name }}</span>
                  </div>
                </template>
              </LibraryItemCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, inject } from 'vue'
import type { Slice, Source, Project } from '@/types/models'
import SliceListItem from '@/components/SliceListItem.vue'
import LibraryItemCard from '@/components/LibraryItemCard.vue'
import { useSliceGrouping } from '@/composables/useSliceGrouping'

interface Props {
  slices: Slice[]
  sources: Source[]
}

const props = defineProps<Props>()
const projectsRef = inject<any>('projects') as { value: Project[] } | undefined
const activeTab = ref<'slices' | 'library'>('slices')
const hideAssigned = ref<boolean>(false)

const sortedSlices = computed(() => {
  return [...props.slices].sort((a, b) => b.updatedAt - a.updatedAt)
})

const filteredSlices = computed(() => {
  if (!hideAssigned.value) return sortedSlices.value
  return sortedSlices.value.filter(s => (projectsBySliceId.value[s.id]?.length || 0) === 0)
})

const getSourceName = (id: string) => props.sources.find(s => s.id === id)?.name || 'Unknown'

// Grouped view
const slicesRef = computed(() => props.slices)
const sourcesRef = computed(() => props.sources)
const { groupedSlices } = useSliceGrouping({ slices: slicesRef as any, sources: sourcesRef as any })

// Flatten grouped slices for rendering
const groupedArray = computed(() => {
  const out: Record<string, Array<{ type: string; title: string; count: number; locations: Set<string>; sliceIds: string[] }>> = {}
  const groups = groupedSlices.value
  Object.keys(groups).forEach(type => {
    out[type] = Object.keys(groups[type]).map(title => {
      const g = groups[type][title]
      return { type, title, count: g.count, locations: g.locations, sliceIds: g.slices.map(s => s.id) }
    })
  })
  return out
})

const groupTypes = computed(() => Object.keys(groupedArray.value))

const filteredGroups = computed(() => {
  if (!hideAssigned.value) return groupedArray.value
  const out: Record<string, Array<{ type: string; title: string; count: number; locations: Set<string>; sliceIds: string[] }>> = {}
  for (const type of Object.keys(groupedArray.value)) {
    const items = groupedArray.value[type].filter(item => projectsForGroup(item.sliceIds).length === 0)
    if (items.length > 0) out[type] = items
  }
  return out
})

const groupTypesFiltered = computed(() => Object.keys(filteredGroups.value))

const onDragStartSlices = (sliceIds: string[], e: DragEvent) => {
  if (!e.dataTransfer) return
  const payload = { kind: 'slice-ids', sliceIds }
  e.dataTransfer.setData('application/x-practice-slices', JSON.stringify(payload))
  // Some browsers (e.g., Safari) require a text/plain payload to enable DnD
  e.dataTransfer.setData('text/plain', `slices:${sliceIds.join(',')}`)
  e.dataTransfer.effectAllowed = 'copyMove'
}

const onDragStartGroup = (item: { type: string; title: string }, e: DragEvent) => {
  if (!e.dataTransfer) return
  const payload = { kind: 'group-ref', ref: { type: item.type, title: item.title } }
  e.dataTransfer.setData('application/x-practice-slices', JSON.stringify(payload))
  e.dataTransfer.setData('text/plain', `group:type=${item.type};title=${item.title}`)
  e.dataTransfer.effectAllowed = 'copyMove'
}

// Projects mapping for badges
const projectsBySliceId = computed<Record<string, Project[]>>(() => {
  const out: Record<string, Project[]> = {}
  const projects = projectsRef?.value || []
  const allSlices = props.slices || []
  for (const p of projects) {
    // Explicit slice membership
    for (const id of p.sliceIds || []) {
      if (!out[id]) out[id] = []
      if (!out[id].some(pp => pp.id === p.id)) out[id].push(p)
    }
    // Group-derived membership (dynamic)
    for (const g of p.groups || []) {
      for (const s of allSlices) {
        if (s.type === g.type && s.title === g.title) {
          const id = s.id
          if (!out[id]) out[id] = []
          if (!out[id].some(pp => pp.id === p.id)) out[id].push(p)
        }
      }
    }
  }
  return out
})

const projectsForGroup = (sliceIds: string[]): Project[] => {
  const seen = new Map<string, Project>()
  for (const id of sliceIds) {
    for (const p of projectsBySliceId.value[id] || []) {
      if (!seen.has(p.id)) seen.set(p.id, p)
    }
  }
  return Array.from(seen.values())
}

// Badge styling helpers
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  let h = hex.trim()
  if (h.startsWith('#')) h = h.slice(1)
  if (h.length === 3) {
    h = h.split('').map(c => c + c).join('')
  }
  if (h.length !== 6) return null
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  if ([r, g, b].some(n => Number.isNaN(n))) return null
  return { r, g, b }
}

const getTextColorForBg = (hex: string): string => {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#ffffff'
  const { r, g, b } = rgb
  // YIQ contrast
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 140 ? '#111111' : '#ffffff'
}

const badgeStyleForProject = (p: Project): Record<string, string> => {
  const base = p.color || '#4a9eff'
  const color = getTextColorForBg(base)
  return {
    backgroundColor: base,
    color,
    borderColor: base,
  }
}

// Collapse/expand state for group type sections
const collapsedTypes = ref<Record<string, boolean>>({})
const isTypeCollapsed = (type: string) => !!collapsedTypes.value[type]
const toggleTypeCollapse = (type: string) => {
  collapsedTypes.value[type] = !collapsedTypes.value[type]
}
</script>

<style scoped lang="scss">
.sidebar-slice-browser {
  width: 380px;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.02);
}

.sidebar-header {
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.tab-btn {
  border-radius: 0;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-left: none !important;
  border-bottom: none !important;
}

.tab-btn.active {
  /* Slight emphasis when active */
  position: relative;
  top: 1px; /* visually sits on header bottom border */
  border-bottom-color: transparent;
}

.tab-label {
  /* Keep label compact */
}

.toggle-btn {
  border-radius: 0;
}

.type-header {
  letter-spacing: 0.06em;
}

.collapse-btn {
  border-radius: 0;
}

.draggable-card {
  cursor: grab;
}

.draggable-card:active {
  cursor: grabbing;
}

.project-badges {
  /* compact badge row */
}
</style>
