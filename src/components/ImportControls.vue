<script setup lang="ts">
import { ref } from 'vue'
import { 
  isFileSystemAccessSupported,
  pickAudioFiles,
  pickAudioDirectory,
  getAllAudioFiles,
  getFileFromHandle
} from '@/services/fileSystem'
import { saveAudioFile } from '@/services/db'
import { AudioService } from '@/services/audio'
import { useWaveformWorker } from '@/composables/useWaveformWorker'
import { generateId } from '@/utils/helpers'
import type { AudioFile } from '@/types/models'

const emit = defineEmits<{
  filesImported: [files: AudioFile[]]
}>()

const isSupported = isFileSystemAccessSupported()
const isImporting = ref(false)
const importStatus = ref('')

const audioService = new AudioService()
const { generateWaveform } = useWaveformWorker()

const importFiles = async () => {
  if (!isSupported) return

  try {
    isImporting.value = true
    importStatus.value = 'Opening file picker...'

    const handles = await pickAudioFiles()
    await processFileHandles(handles)
  } catch (error) {
    if (error instanceof Error && error.name !== 'AbortError') {
      console.error('Error importing files:', error)
      importStatus.value = `Error: ${error.message}`
    } else {
      importStatus.value = ''
    }
  } finally {
    isImporting.value = false
  }
}

const importFolder = async () => {
  if (!isSupported) return

  try {
    isImporting.value = true
    importStatus.value = 'Opening folder picker...'

    const dirHandle = await pickAudioDirectory()
    importStatus.value = 'Scanning folder for audio files...'
    
    const handles = await getAllAudioFiles(dirHandle)
    await processFileHandles(handles)
  } catch (error) {
    if (error instanceof Error && error.name !== 'AbortError') {
      console.error('Error importing folder:', error)
      importStatus.value = `Error: ${error.message}`
    } else {
      importStatus.value = ''
    }
  } finally {
    isImporting.value = false
  }
}

const processFileHandles = async (handles: FileSystemFileHandle[]) => {
  const importedFiles: AudioFile[] = []

  for (let i = 0; i < handles.length; i++) {
    const handle = handles[i]
    importStatus.value = `Processing ${i + 1} of ${handles.length}: ${handle.name}`

    try {
      const file = await getFileFromHandle(handle)
      
      // Load and decode audio
      const audioBuffer = await audioService.loadAudioFile(file)
      
      // Generate waveform (downsample to ~2000 samples)
      const samplesPerPixel = Math.ceil(audioBuffer.length / 2000)
      const waveformData = await generateWaveform(audioBuffer, samplesPerPixel)

      // Create AudioFile record
      const audioFile: AudioFile = {
        id: generateId(),
        name: handle.name,
        fileHandle: handle,
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        waveformData,
        importedAt: Date.now(),
        size: file.size,
      }

      // Save to IndexedDB
      await saveAudioFile(audioFile)
      importedFiles.push(audioFile)
    } catch (error) {
      console.error(`Error processing ${handle.name}:`, error)
    }
  }

  if (importedFiles.length > 0) {
    importStatus.value = `Successfully imported ${importedFiles.length} file(s)`
    emit('filesImported', importedFiles)
    
    // Clear status after 3 seconds
    setTimeout(() => {
      importStatus.value = ''
    }, 3000)
  }
}
</script>

<template>
  <div class="import-controls">
    <div v-if="!isSupported" class="not-supported">
      <p>⚠️ File System Access API is not supported in this browser.</p>
      <p class="hint">Try Chrome or Edge for full functionality.</p>
    </div>

    <div v-else class="import-buttons">
      <button 
        @click="importFiles" 
        :disabled="isImporting"
        class="btn-import"
      >
        📁 Import Files
      </button>

      <button 
        @click="importFolder" 
        :disabled="isImporting"
        class="btn-import"
      >
        📂 Import Folder
      </button>
    </div>

    <div v-if="importStatus" class="import-status">
      <div class="status-spinner" v-if="isImporting"></div>
      {{ importStatus }}
    </div>
  </div>
</template>

<style scoped>
.import-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.not-supported {
  padding: 1rem;
  background: rgba(255, 165, 0, 0.1);
  border: 1px solid rgba(255, 165, 0, 0.3);
  border-radius: 8px;
}

.not-supported p {
  margin: 0.5rem 0;
}

.hint {
  font-size: 0.85rem;
  opacity: 0.7;
}

.import-buttons {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.btn-import {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  border-radius: 8px;
  border: 1px solid rgba(74, 158, 255, 0.5);
  background-color: rgba(74, 158, 255, 0.1);
  color: #4a9eff;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-import:hover:not(:disabled) {
  background-color: rgba(74, 158, 255, 0.2);
  border-color: #4a9eff;
}

.btn-import:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.import-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  font-size: 0.9rem;
}

.status-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: #4a9eff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
