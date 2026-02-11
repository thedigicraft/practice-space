<script setup lang="ts">
import { computed } from 'vue'
import type { Collection, Slice } from '@/types/models'

interface Props {
  collections: Collection[]
  slices: Slice[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  selectCollection: [collection: Collection]
  createCollection: []
}>()

const collectionsWithCounts = computed(() => {
  return props.collections.map(collection => ({
    ...collection,
    sliceCount: collection.sliceIds.length,
  }))
})

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <div class="collection-list">
    <div class="list-header">
      <h3>Collections</h3>
      <button @click="emit('createCollection')" class="btn btn-primary">
        <i class="fas fa-plus me-1"></i>New Collection
      </button>
    </div>

    <div v-if="collections.length === 0" class="empty-state">
      <p>No collections yet</p>
      <p class="hint">Create collections to organize your slices</p>
    </div>

    <div v-else class="collections-grid">
      <div
        v-for="collection in collectionsWithCounts"
        :key="collection.id"
        class="card h-100"
        style="cursor: pointer;"
        @click="emit('selectCollection', collection)"
      >
        <div class="collection-color-bar" :style="{ background: collection.color, height: '4px' }"></div>
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h4 class="card-title h6 m-0">{{ collection.name }}</h4>
            <span class="badge bg-primary">{{ collection.sliceCount }}</span>
          </div>
          <p v-if="collection.description" class="card-text">
            {{ collection.description }}
          </p>
          <p class="card-text text-muted small">
            Updated {{ formatDate(collection.updatedAt) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.collection-list {
  width: 100%;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.list-header h3 {
  margin: 0;
  font-size: 1.25rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  opacity: 0.5;
}

.empty-state p {
  margin: 0.5rem 0;
}

.hint {
  font-size: 0.85rem;
}

.collections-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.collection-color-bar {
  width: 100%;
}
</style>
