<template>
  <div class="library-type-section">
    <h3 class="type-header d-flex align-items-center gap-2">
      <div class="item-icon d-flex align-items-center justify-content-center">
        <i :class="getTypeIcon(sliceType)"></i>
      </div>
      {{ formatTypeName(sliceType) }}
    </h3>
    <div class="grouped-items d-flex flex-column gap-3">
      <LibraryItemCard
        v-for="(sliceGroup, title) in groups"
        :key="`${sliceType}-${title}`"
        :title="title"
        :count="sliceGroup.count"
        :locations="sliceGroup.locations"
        @click="$emit('openGroup', sliceType, title)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Slice } from '@/types/models'
import LibraryItemCard from './LibraryItemCard.vue'
import { useTypeFormatting } from '@/composables/useTypeFormatting'

const { formatTypeName, getTypeIcon } = useTypeFormatting()

interface SliceGroup {
  count: number
  slices: Slice[]
  locations: Set<string>
}

interface Props {
  sliceType: string
  groups: Record<string, SliceGroup>
}

defineProps<Props>()

defineEmits<{
  openGroup: [type: string, title: string]
}>()
</script>

<style scoped lang="scss">
.library-type-section {
  flex: 1;
  min-width: 250px;
}

.type-header {
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: #fff;
}

.item-icon {
  width: 2rem;
  height: 2rem;
  background: rgba(74, 158, 255, 0.15);
  border-radius: 8px;
  font-size: 1rem;
  color: #4a9eff;
}
</style>
