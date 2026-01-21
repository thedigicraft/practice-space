<template>
  <div class="project-view">
    <header class="view-header">
      <div class="header-content">
        <button class="btn-back" @click="$emit('back')">
          ← Back
        </button>
        <div class="project-header-info" v-if="project">
          <div class="project-color-bar" :style="{ backgroundColor: project.color || '#4a9eff' }"></div>
          <div class="project-title">
            <h1>{{ project.name }}</h1>
            <p class="project-description" v-if="project.description">
              {{ project.description }}
            </p>
          </div>
        </div>
      </div>
    </header>

    <div class="project-content" v-if="project">
      <section class="slices-section">
        <div class="section-header">
          <h2>Slices in this project ({{ projectSlices.length }})</h2>
        </div>

        <div v-if="projectSlices.length === 0" class="empty-state">
          <p>This project has no slices yet.</p>
          <p class="hint">Add slices to this project from the Slice Browser!</p>
        </div>

        <div v-else class="slices-list">
          <div
            v-for="slice in projectSlices"
            :key="slice.id"
            class="slice-card"
            :class="{ 'is-playing': currentlyPlayingSliceId === slice.id && isPlaying }"
          >
            <button 
              class="play-btn"
              @click="handlePlaySlice(slice)"
            >
              {{ currentlyPlayingSliceId === slice.id && isPlaying ? '⏸' : '▶' }}
            </button>
            <div class="slice-info">
              <h3 class="slice-title">{{ slice.title }}</h3>
              <p class="slice-source" v-if="getSourceName(slice.audioFileId)">
                Source: {{ getSourceName(slice.audioFileId) }}
              </p>
              <p class="slice-time">
                {{ formatTime(slice.startTime) }} - {{ formatTime(slice.endTime) }}
                <span class="slice-duration">({{ formatDuration(slice.endTime - slice.startTime) }})</span>
              </p>
              <div v-if="slice.tags && slice.tags.length > 0" class="slice-tags">
                <span v-for="tag in slice.tags" :key="tag" class="tag">{{ tag }}</span>
              </div>
            </div>
            <button 
              class="btn-view-source"
              @click="handleViewSource(slice.audioFileId)"
              title="View in Source Editor"
            >
              View Source →
            </button>
          </div>
        </div>
      </section>
    </div>

    <div v-else class="empty-state">
      <p>Project not found.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Project, Slice, Source } from '../types/models'
import { formatTime } from '../utils/helpers'

interface Props {
  project: Project | null
  slices: Slice[]
  sources: Source[]
  currentlyPlayingSliceId: string | null
  isPlaying: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  back: []
  playSlice: [slice: Slice]
  viewSource: [sourceId: string]
}>()

const projectSlices = computed(() => {
  if (!props.project) return []
  return props.slices.filter(s => props.project!.sliceIds.includes(s.id))
})

const formatDuration = (seconds: number) => formatTime(seconds)

const getSourceName = (sourceId: string): string | null => {
  const source = props.sources.find(s => s.id === sourceId)
  return source?.name || null
}

const handlePlaySlice = (slice: Slice) => {
  emit('playSlice', slice)
}

const handleViewSource = (sourceId: string) => {
  emit('viewSource', sourceId)
}
</script>

<style scoped>
.project-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
}

.view-header {
  background: #1e1e1e;
  border-bottom: 1px solid #333;
  padding: 1rem 2rem;
}

.header-content {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  max-width: 1400px;
  margin: 0 auto;
}

.btn-back {
  background: #2a2a2a;
  color: #fff;
  border: 1px solid #444;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-back:hover {
  background: #333;
  border-color: #555;
}

.project-header-info {
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.project-color-bar {
  width: 4px;
  height: 60px;
  border-radius: 2px;
  flex-shrink: 0;
}

.project-title {
  flex: 1;
  min-width: 0;
}

.project-title h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #fff;
}

.project-description {
  margin: 0.5rem 0 0 0;
  font-size: 0.9rem;
  color: #aaa;
}

.project-content {
  flex: 1;
  overflow: auto;
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.slices-section {
  background: #1e1e1e;
  border-radius: 8px;
  padding: 1.5rem;
}

.section-header {
  margin-bottom: 1.5rem;
}

.section-header h2 {
  margin: 0;
  font-size: 1.3rem;
  color: #fff;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #888;
}

.empty-state p {
  margin: 0.5rem 0;
}

.hint {
  font-size: 0.9rem;
  color: #666;
}

/* Slices List */
.slices-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.slice-card {
  background: #2a2a2a;
  border-radius: 6px;
  padding: 1rem;
  display: flex;
  gap: 1rem;
  align-items: center;
  transition: all 0.2s;
}

.slice-card:hover {
  background: #333;
}

.slice-card.is-playing {
  background: #2d3e50;
  border-left: 3px solid #4a9eff;
}

.play-btn {
  background: #4a9eff;
  color: white;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}

.play-btn:hover {
  background: #357abd;
  transform: scale(1.05);
}

.slice-info {
  flex: 1;
  min-width: 0;
}

.slice-title {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  color: #fff;
}

.slice-source {
  margin: 0 0 0.25rem 0;
  font-size: 0.85rem;
  color: #4a9eff;
}

.slice-time {
  margin: 0 0 0.5rem 0;
  font-size: 0.85rem;
  color: #888;
}

.slice-duration {
  color: #666;
  margin-left: 0.5rem;
}

.slice-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  background: #333;
  color: #4a9eff;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
}

.btn-view-source {
  background: #2a2a2a;
  color: #4a9eff;
  border: 1px solid #4a9eff;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-view-source:hover {
  background: #4a9eff;
  color: white;
}
</style>
