/**
 * Composable for keyboard shortcuts
 */

import { onMounted, onUnmounted } from 'vue'

export interface KeyboardShortcutHandlers {
  onPlayPause?: () => void
  onSeekForward?: () => void
  onSeekBackward?: () => void
  onStop?: () => void
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  const handleKeydown = (event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return
    }

    switch (event.code) {
      case 'Space':
        // Spacebar for play/pause
        event.preventDefault()
        handlers.onPlayPause?.()
        break

      case 'ArrowLeft':
        // Left arrow to seek backward 5 seconds
        event.preventDefault()
        handlers.onSeekBackward?.()
        break

      case 'ArrowRight':
        // Right arrow to seek forward 5 seconds
        event.preventDefault()
        handlers.onSeekForward?.()
        break

      case 'KeyK':
        // K to pause (video editing convention)
        if (!event.metaKey && !event.ctrlKey) {
          event.preventDefault()
          handlers.onPlayPause?.()
        }
        break

      case 'KeyJ':
        // J to rewind (video editing convention)
        if (!event.metaKey && !event.ctrlKey) {
          event.preventDefault()
          handlers.onSeekBackward?.()
        }
        break

      case 'KeyL':
        // L to fast forward (video editing convention)
        if (!event.metaKey && !event.ctrlKey) {
          event.preventDefault()
          handlers.onSeekForward?.()
        }
        break

      case 'Escape':
        // Escape to stop playback
        event.preventDefault()
        handlers.onStop?.()
        break
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })
}
