/**
 * Audio service for playback using Web Audio API
 * 
 * Handles loading audio files, creating audio contexts,
 * and managing playback state.
 */

export class AudioService {
  private audioContext: AudioContext | null = null
  private currentSource: AudioBufferSourceNode | null = null
  private currentBuffer: AudioBuffer | null = null
  private startTime = 0
  private pauseTime = 0
  private isPlaying = false

  /**
   * Get or create the audio context
   */
  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
    }
    return this.audioContext
  }

  /**
   * Load an audio file and decode it
   */
  async loadAudioFile(file: File): Promise<AudioBuffer> {
    // Stop any existing playback before loading new audio
    this.stop()
    
    const arrayBuffer = await file.arrayBuffer()
    const audioContext = this.getAudioContext()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    this.currentBuffer = audioBuffer
    return audioBuffer
  }

  /**
   * Play audio from a specific time
   */
  play(startOffset = 0, duration?: number): void {
    if (!this.currentBuffer) {
      throw new Error('No audio buffer loaded')
    }

    // Always stop any existing source first
    this.stop()

    const audioContext = this.getAudioContext()
    const source = audioContext.createBufferSource()
    source.buffer = this.currentBuffer
    source.connect(audioContext.destination)

    this.currentSource = source
    this.startTime = audioContext.currentTime - startOffset
    this.isPlaying = true

    if (duration !== undefined) {
      source.start(0, startOffset, duration)
    } else {
      source.start(0, startOffset)
    }

    source.onended = () => {
      // Only clear state if this is still the current source
      if (this.currentSource === source) {
        this.isPlaying = false
        this.currentSource = null
      }
    }
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.currentSource && this.isPlaying) {
      const audioContext = this.getAudioContext()
      this.pauseTime = audioContext.currentTime - this.startTime
      this.stop()
    }
  }

  /**
   * Resume playback from paused position
   */
  resume(): void {
    if (this.pauseTime > 0) {
      this.play(this.pauseTime)
      this.pauseTime = 0
    }
  }

  /**
   * Stop playback
   */
  stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop()
      } catch {
        // Ignore errors if already stopped
      }
      this.currentSource.disconnect()
      this.currentSource = null
    }
    this.isPlaying = false
    this.pauseTime = 0
  }

  /**
   * Get current playback position
   */
  getCurrentTime(): number {
    if (!this.isPlaying) {
      return this.pauseTime
    }
    const audioContext = this.getAudioContext()
    return audioContext.currentTime - this.startTime
  }

  /**
   * Check if audio is currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying
  }

  /**
   * Get the loaded audio buffer
   */
  getAudioBuffer(): AudioBuffer | null {
    return this.currentBuffer
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stop()
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    this.currentBuffer = null
  }
}

/**
 * Process a dropped file and create an AudioFile object
 * This creates a temporary FileSystemFileHandle-like object from a File
 */
export async function processAudioFile(file: File): Promise<any> {
  const { saveAudioFile } = await import('./db')
  const { generateWaveformData } = await import('../utils/helpers')
  
  // Decode audio to get metadata
  const audioContext = new AudioContext()
  const arrayBuffer = await file.arrayBuffer()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
  
  // Generate waveform
  const waveformData = await generateWaveformData(audioBuffer, 800)
  
  const now = Date.now()
  
  // Extract title from filename (without extension)
  const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
  
  // Try to get file creation date (file.lastModified is best we can get from File API)
  const createdAt = file.lastModified || now
  
  // Create a synthetic file handle (for dropped files, we store the file directly)
  // Note: This won't persist across sessions like File System Access API handles
  const audioFile = {
    id: crypto.randomUUID(),
    name: file.name,
    title: nameWithoutExt,
    fileHandle: null as any, // Will be set below
    duration: audioBuffer.duration,
    sampleRate: audioBuffer.sampleRate,
    numberOfChannels: audioBuffer.numberOfChannels,
    waveformData,
    size: file.size,
    createdAt,
    importedAt: now,
    location: undefined,
    notes: undefined,
  }
  
  // Store the actual File object as a pseudo-handle
  // We'll need to handle this specially in the audio playback code
  audioFile.fileHandle = {
    kind: 'file',
    name: file.name,
    _droppedFile: file, // Store the actual File object
    getFile: async () => file,
  } as any
  
  await saveAudioFile(audioFile)
  await audioContext.close()
  
  return audioFile
}

/**
 * Decode audio data from an ArrayBuffer
 */
export async function loadAudioBuffer(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
  const audioContext = new AudioContext()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
  await audioContext.close()
  return audioBuffer
}
