import { computed, type Ref } from 'vue'
import type { Slice, Source } from '@/types/models'

export interface SliceGroup {
  count: number
  slices: Slice[]
  locations: Set<string>
}

export type GroupedSlices = Record<string, Record<string, SliceGroup>>

export interface SliceGroupingOptions {
  slices: Ref<Slice[]>
  sources: Ref<Source[]>
}

export function useSliceGrouping(options: SliceGroupingOptions) {
  const { slices, sources } = options

  // Group slices by type and title
  const groupedSlices = computed<GroupedSlices>(() => {
    const groups: GroupedSlices = {}
    
    slices.value.forEach(slice => {
      // Only group slices that have a type and title
      if (!slice.type || !slice.title) return
      
      if (!groups[slice.type]) {
        groups[slice.type] = {}
      }
      
      if (!groups[slice.type][slice.title]) {
        groups[slice.type][slice.title] = { count: 0, slices: [], locations: new Set() }
      }
      
      groups[slice.type][slice.title].count++
      groups[slice.type][slice.title].slices.push(slice)
      
      // Add location from source file
      const source = sources.value.find(s => s.id === slice.audioFileId)
      if (source?.location) {
        groups[slice.type][slice.title].locations.add(source.location)
      }
    })
    
    return groups
  })

  // Get recent grouped slices (limited to first N items per type)
  const getRecentGroupedSlices = (limit: number = 5): GroupedSlices => {
    const limitedGroups: GroupedSlices = {}
    
    Object.keys(groupedSlices.value).forEach(type => {
      const titles = Object.keys(groupedSlices.value[type])
      limitedGroups[type] = {}
      
      // Get first N titles
      titles.slice(0, limit).forEach(title => {
        limitedGroups[type][title] = groupedSlices.value[type][title]
      })
    })
    
    return limitedGroups
  }

  return {
    groupedSlices,
    getRecentGroupedSlices
  }
}
