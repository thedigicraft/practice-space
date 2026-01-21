<script setup lang="ts">
import { formatFileSize, formatTime } from '@/utils/helpers'
import type { AudioFile } from '@/types/models'

interface Props {
  files: AudioFile[]
  currentlyPlayingFileId?: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  selectFile: [file: AudioFile]
  playFile: [file: AudioFile]
}>()

const handlePlayClick = (file: AudioFile, event: MouseEvent) => {
  event.stopPropagation()
  emit('playFile', file)
}
</script>

<template>
  <div class="audio-file-list">
    <div v-if="files.length === 0" class="empty-state">
      <p>No audio files imported yet</p>
      <p class="hint">Import files or folders to get started</p>
    </div>

    <div v-else class="file-list">
      <div 
        v-for="file in files" 
        :key="file.id"
        class="file-item"
        :class="{ 'is-playing': file.id === currentlyPlayingFileId }"
        @click="emit('selectFile', file)"
      >
        <button 
          class="play-btn"
          @click="handlePlayClick(file, $event)"
          title="Play file"
        >
          <span v-if="file.id === currentlyPlayingFileId" class="playing-icon">⏸</span>
          <span v-else>▶</span>
        </button>
        <div class="file-icon">🎵</div>
        <div class="file-info">
          <div class="file-name">{{ file.name }}</div>
          <div class="file-meta">
            {{ formatTime(file.duration) }} · 
            {{ file.sampleRate / 1000 }}kHz · 
            {{ file.numberOfChannels }}ch · 
            {{ formatFileSize(file.size) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.audio-file-list {
  width: 100%;
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

.file-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.file-item.is-playing {
  background: rgba(74, 158, 255, 0.15);
  border-color: rgba(74, 158, 255, 0.5);
  box-shadow: 0 0 20px rgba(74, 158, 255, 0.2);
}

.playing-icon {
  display: inline-block;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}play-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(74, 158, 255, 0.5);
  background: rgba(74, 158, 255, 0.1);
  color: #4a9eff;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.play-btn:hover {
  background: rgba(74, 158, 255, 0.2);
  transform: scale(1.1);
}

.file-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(74, 158, 255, 0.5);
}

.file-icon {
  font-size: 2rem;
  line-height: 1;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-weight: 500;
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  font-size: 0.85rem;
  opacity: 0.7;
}
</style>
