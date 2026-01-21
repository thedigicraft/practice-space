/**
 * Composable for drag and drop file handling
 */

import { ref, onMounted, onUnmounted } from 'vue'

export interface DragAndDropOptions {
  onFilesDropped: (files: File[]) => void
  acceptedTypes?: string[]
}

export function useDragAndDrop(options: DragAndDropOptions) {
  const isDragging = ref(false)
  const dragCounter = ref(0)

  const acceptedTypes = options.acceptedTypes || [
    'audio/mpeg',
    'audio/wav',
    'audio/mp3',
    'audio/m4a',
    'audio/aac',
    'audio/ogg',
    'audio/flac',
  ]

  const isValidFile = (file: File): boolean => {
    return acceptedTypes.some(type => {
      // Handle wildcards like audio/*
      if (type.endsWith('/*')) {
        const prefix = type.slice(0, -2)
        return file.type.startsWith(prefix)
      }
      return file.type === type
    })
  }

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    dragCounter.value++
    if (dragCounter.value === 1) {
      isDragging.value = true
    }
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    dragCounter.value--
    if (dragCounter.value === 0) {
      isDragging.value = false
    }
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy'
    }
  }

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    isDragging.value = false
    dragCounter.value = 0

    if (!e.dataTransfer) return

    const files: File[] = []
    const items = Array.from(e.dataTransfer.items)

    // Process all dropped items
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file && isValidFile(file)) {
          files.push(file)
        }
      }
    }

    if (files.length > 0) {
      options.onFilesDropped(files)
    }
  }

  const setupListeners = () => {
    document.addEventListener('dragenter', handleDragEnter)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('drop', handleDrop)
  }

  const removeListeners = () => {
    document.removeEventListener('dragenter', handleDragEnter)
    document.removeEventListener('dragleave', handleDragLeave)
    document.removeEventListener('dragover', handleDragOver)
    document.removeEventListener('drop', handleDrop)
  }

  onMounted(() => {
    setupListeners()
  })

  onUnmounted(() => {
    removeListeners()
  })

  return {
    isDragging,
  }
}
