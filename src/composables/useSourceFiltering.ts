import { computed, type Ref } from 'vue'
import type { Source } from '@/types/models'

export interface SourceFilterOptions {
  sources: Ref<Source[]>
  searchQuery: Ref<string>
  locationFilter: Ref<string>
  sortBy: Ref<'importedAt' | 'title' | 'name' | 'duration' | 'size'>
}

export function useSourceFiltering(options: SourceFilterOptions) {
  const { sources, searchQuery, locationFilter, sortBy } = options

  // Get unique locations from all sources
  const uniqueLocations = computed(() => {
    const locations = sources.value
      .map(s => s.location)
      .filter((loc): loc is string => !!loc)
    return Array.from(new Set(locations)).sort()
  })

  // Filter and sort sources based on criteria
  const filteredSources = computed(() => {
    let filtered = [...sources.value]

    // Apply search filter
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      filtered = filtered.filter(source =>
        (source.title?.toLowerCase().includes(query)) ||
        source.name.toLowerCase().includes(query) ||
        (source.location?.toLowerCase().includes(query))
      )
    }

    // Apply location filter
    if (locationFilter.value) {
      filtered = filtered.filter(source => source.location === locationFilter.value)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy.value) {
        case 'title':
          return (a.title || a.name).localeCompare(b.title || b.name)
        case 'name':
          return a.name.localeCompare(b.name)
        case 'duration':
          return b.duration - a.duration
        case 'size':
          return b.size - a.size
        case 'importedAt':
        default:
          return b.importedAt - a.importedAt
      }
    })

    return filtered
  })

  return {
    uniqueLocations,
    filteredSources
  }
}
