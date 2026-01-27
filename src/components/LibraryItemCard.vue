<template>
  <div class="card grouped-item" @click="$emit('click')">
    <div class="card-body d-flex gap-3 align-items-start">
      <div class="item-info flex-fill">
        <h4 class="item-title d-flex justify-content-between align-items-center gap-2">
          <div>{{ title }}</div>
          <span class="badge bg-primary rounded-pill">{{ count }}</span>
        </h4>
        <p v-if="locations.size > 0" class="item-locations m-0">
          <i class="fas fa-map-marker-alt me-1"></i>
          {{ Array.from(locations).join(', ') }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string
  count: number
  locations: Set<string>
}

defineProps<Props>()

defineEmits<{
  click: []
}>()
</script>

<style scoped lang="scss">
.grouped-item {
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(74, 158, 255, 0.2);
  }
}

.item-title {
  margin: 0 0 0.25rem 0;
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-locations {
  font-size: 0.75rem;
  color: #9d4aff;
}
</style>
