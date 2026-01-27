<template>
  <div class="breadcrumb py-3 px-3 d-flex align-items-center">
    <span
      v-for="(crumb, index) in breadcrumbs"
      :key="crumb.id || 'root'"
      class="breadcrumb-item d-flex align-items-center"
    >
      <button
        @click="$emit('navigate', crumb.id)"
        class="btn btn-link breadcrumb-link"
        :class="{ active: index === breadcrumbs.length - 1 }"
      >
        {{ crumb.name }}
      </button>
      <span v-if="index < breadcrumbs.length - 1" class="breadcrumb-sep">/</span>
    </span>
  </div>
</template>

<script setup lang="ts">
interface Breadcrumb {
  id?: string
  name: string
}

interface Props {
  breadcrumbs: Breadcrumb[]
}

defineProps<Props>()

defineEmits<{
  navigate: [folderId: string | undefined]
}>()
</script>

<style scoped lang="scss">
.breadcrumb {
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.9rem;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
}

.breadcrumb-link {
  background: none;
  border: none;
  color: #4a9eff;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background 0.2s;
  text-decoration: none;

  &:hover {
    background: rgba(74, 158, 255, 0.1);
    color: #6bb3ff;
  }

  &.active {
    color: #fff;
    cursor: default;

    &:hover {
      background: none;
      color: #fff;
    }
  }
}

.breadcrumb-sep {
  margin: 0 0.5rem;
  color: #666;
}
</style>
