<template>
  <div 
    class="filters-bar d-flex gap-3 align-items-center"
    :class="{ 'mb-4': !compact }"
  >
    <div class="search-box flex-fill">
      <input
        v-model="search"
        type="text"
        :placeholder="searchPlaceholder"
        :class="['form-control', compact ? 'form-control-sm' : '']"
        @input="$emit('update:search', search)"
      />
    </div>
    <select 
      v-model="location" 
      :class="['form-select', compact ? 'form-select-sm' : '']" 
      style="width: 200px;"
      @change="$emit('update:location', location)"
    >
      <option value="">All Locations</option>
      <option v-for="loc in locations" :key="loc" :value="loc">
        {{ loc }}
      </option>
    </select>
    <select 
      v-model="sort" 
      :class="['form-select', compact ? 'form-select-sm' : '']" 
      style="width: 200px;"
      @change="$emit('update:sort', sort)"
    >
      <option value="importedAt">Sort by Import Date</option>
      <option value="title">Sort by Title</option>
      <option value="name">Sort by Filename</option>
      <option value="duration">Sort by Duration</option>
      <option value="size">Sort by Size</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  locations: string[]
  searchPlaceholder?: string
  initialSearch?: string
  initialLocation?: string
  initialSort?: string
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  searchPlaceholder: 'Search...',
  initialSearch: '',
  initialLocation: '',
  initialSort: 'importedAt',
  compact: false
})

const search = ref(props.initialSearch)
const location = ref(props.initialLocation)
const sort = ref(props.initialSort)

// Watch for prop changes
watch(() => props.initialSearch, (val) => search.value = val)
watch(() => props.initialLocation, (val) => location.value = val)
watch(() => props.initialSort, (val) => sort.value = val)

defineEmits<{
  'update:search': [value: string]
  'update:location': [value: string]
  'update:sort': [value: string]
}>()
</script>

<style scoped lang="scss">
.filters-bar {
  background: var(--bs-body-bg);
  border-radius: 8px;
  padding: 1rem;
}
</style>
