/**
 * Composable for managing audio playback
 */

import { ref, onUnmounted } from 'vue'
import { AudioService } from '@/services/audio'
import { getSourceArrayBuffer } from '@/services/platformAudio'
import type { Source, Slice } from '@/types/models'

export function useAudioPlayback() {
  const audioService = new AudioService()
  
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const isLoading = ref(false)
  const currentlyPlayingFileId = ref<string | null>(null)
  const currentlyPlayingSliceId = ref<string | null>(null)
  
  let animationFrameId: number | null = null
  let currentAudioFile: Source | null = null

  // Update current time while playing
  const updateTime = () => {
    if (isPlaying.value) {
      currentTime.value = audioService.getCurrentTime()
      animationFrameId = requestAnimationFrame(updateTime)
    }
  }

  /**
   * Load an audio file
   */
  const loadAudioFile = async (audioFile: Source): Promise<void> => {
    try {
      // Always stop any existing playback before loading new file
      stop()
      
      isLoading.value = true
      currentAudioFile = audioFile

      const arrayBuffer = await getSourceArrayBuffer(audioFile)
      const buffer = await audioService.loadArrayBuffer(arrayBuffer)
      
      duration.value = buffer.duration
      currentTime.value = 0
      isLoading.value = false
    } catch (error) {
      console.error('Error loading audio file:', error)
      isLoading.value = false
      throw error
    }
  }

  /**
   * Play audio from a specific position
   */
  const play = (startTime = 0, playDuration?: number) => {
    try {
      // Always stop first to prevent multiple instances
      stop()
      
      audioService.play(startTime, playDuration)
      isPlaying.value = true
      updateTime()
    } catch (error) {
      console.error('Error playing audio:', error)
      isPlaying.value = false
    }
  }

  /**
   * Play an entire audio file
   */
  const playAudioFile = async (audioFile: Source) => {
    stop()
    if (currentAudioFile?.id !== audioFile.id) {
      await loadAudioFile(audioFile)
    }
    currentlyPlayingFileId.value = audioFile.id
    currentlyPlayingSliceId.value = null
    play(0)
  }

  /**
   * Play a specific slice
   */
  const playSlice = async (slice: Slice, audioFile: Source) => {
    stop()
    if (currentAudioFile?.id !== audioFile.id) {
      await loadAudioFile(audioFile)
    }
    currentlyPlayingFileId.value = audioFile.id
    currentlyPlayingSliceId.value = slice.id
    // If the source is a generated clip, play the full clip from 0
    if ((audioFile as any).isClip && (audioFile as any).originSliceId === slice.id) {
      play(0, audioFile.duration)
    } else {
      const sliceDuration = slice.endTime - slice.startTime
      play(slice.startTime, sliceDuration)
    }
  }

  /**
   * Pause playback
   */
  const pause = () => {
    audioService.pause()
    isPlaying.value = false
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  /**
   * Toggle play/pause
   */
  const togglePlayPause = () => {
    if (isPlaying.value) {
      pause()
    } else if (audioService.getAudioBuffer()) {
      // Resume or start from current position without resetting playhead
      audioService.play(currentTime.value)
      isPlaying.value = true
      updateTime()
    }
  }

  /**
   * Stop playback
   */
  const stop = (resetPosition: boolean = true) => {
    audioService.stop(resetPosition)
    isPlaying.value = false
    if (resetPosition) currentTime.value = 0
    currentlyPlayingFileId.value = null
    currentlyPlayingSliceId.value = null
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  /**
   * Seek to a specific time
   */
  const seek = (time: number) => {
    const wasPlaying = isPlaying.value
    stop(false)
    currentTime.value = time
    if (wasPlaying) {
      play(time)
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stop()
    audioService.dispose()
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
    }
  })

  return {
    isPlaying,
    currentTime,
    duration,
    isLoading,
    currentlyPlayingFileId,
    currentlyPlayingSliceId,
    loadAudioFile,
    play,
    playAudioFile,
    playSlice,
    pause,
    togglePlayPause,
    stop,
    seek,
  }
}
