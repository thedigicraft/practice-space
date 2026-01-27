/**
 * Audio export utilities
 * Handles exporting audio slices in multiple formats with metadata
 */

import type { Slice } from '../types/models'
import { Mp3Encoder } from '@breezystack/lamejs'
import * as ID3Writer from 'browser-id3-writer'

export type ExportFormat = 'wav' | 'mp3' | 'flac' | 'ogg'

export interface ExportOptions {
  format: ExportFormat
  quality?: number // For lossy formats (mp3, ogg): 0-100
  includeMetadata?: boolean
  onProgress?: (progress: number) => void // Progress callback for slow formats
}

/**
 * Convert an AudioBuffer to WAV format
 */
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const length = buffer.length * buffer.numberOfChannels * 2
  const arrayBuffer = new ArrayBuffer(44 + length)
  const view = new DataView(arrayBuffer)
  const channels: Float32Array[] = []
  let pos = 0

  // Get all channel data
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i))
  }

  // Write WAVE header
  const writeString = (str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(pos++, str.charCodeAt(i))
    }
  }

  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true)
    pos += 2
  }

  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true)
    pos += 4
  }

  // RIFF chunk descriptor
  writeString('RIFF')
  setUint32(36 + length) // File size - 8
  writeString('WAVE')

  // FMT sub-chunk
  writeString('fmt ')
  setUint32(16) // Subchunk1Size (16 for PCM)
  setUint16(1) // AudioFormat (1 for PCM)
  setUint16(buffer.numberOfChannels)
  setUint32(buffer.sampleRate)
  setUint32(buffer.sampleRate * buffer.numberOfChannels * 2) // ByteRate
  setUint16(buffer.numberOfChannels * 2) // BlockAlign
  setUint16(16) // BitsPerSample

  // Data sub-chunk
  writeString('data')
  setUint32(length)

  // Write interleaved PCM samples
  const volume = 0.8 // Slight volume reduction to prevent clipping
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i])) * volume
      view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      pos += 2
    }
  }

  return arrayBuffer
}

/**
 * Extract a slice from an AudioBuffer
 */
export function extractSlice(
  buffer: AudioBuffer,
  startTime: number,
  endTime: number
): AudioBuffer {
  const startSample = Math.floor(startTime * buffer.sampleRate)
  const endSample = Math.ceil(endTime * buffer.sampleRate)
  const sliceLength = endSample - startSample

  // Create new AudioBuffer for the slice
  const sliceBuffer = new AudioContext().createBuffer(
    buffer.numberOfChannels,
    sliceLength,
    buffer.sampleRate
  )

  // Copy data for each channel
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const sourceData = buffer.getChannelData(channel)
    const sliceData = sliceBuffer.getChannelData(channel)
    
    for (let i = 0; i < sliceLength; i++) {
      sliceData[i] = sourceData[startSample + i]
    }
  }

  return sliceBuffer
}

/**
 * Export an AudioBuffer slice as an audio file with metadata
 */
export async function exportSlice(
  buffer: AudioBuffer,
  startTime: number,
  endTime: number,
  fileName: string,
  slice?: Slice,
  options: ExportOptions = { format: 'mp3', quality: 90, includeMetadata: true }
): Promise<void> {
  // Extract the slice
  const sliceBuffer = extractSlice(buffer, startTime, endTime)
  
  // For now, we'll use WAV as the base format and convert via MediaRecorder for MP3
  // Since we're in a browser, we can use MediaRecorder API for MP3 encoding
  const { format, quality = 90, includeMetadata = true, onProgress } = options
  
  if (format === 'wav') {
    await exportAsWav(sliceBuffer, fileName, slice, includeMetadata)
  } else if (format === 'mp3') {
    await exportAsMp3(sliceBuffer, fileName, slice, quality, includeMetadata, onProgress)
  } else {
    // Fallback to WAV for unsupported formats
    console.warn(`Format ${format} not fully supported yet, using WAV`)
    await exportAsWav(sliceBuffer, fileName, slice, includeMetadata)
  }
}

/**
 * Export as WAV (clean filename - WAV format has limited metadata support)
 */
async function exportAsWav(
  buffer: AudioBuffer,
  fileName: string,
  slice?: Slice,
  includeMetadata: boolean = true
): Promise<void> {
  const wavData = audioBufferToWav(buffer)
  const blob = new Blob([wavData], { type: 'audio/wav' })
  
  const finalFileName = fileName.endsWith('.wav') ? fileName : `${fileName}.wav`
  downloadBlob(blob, finalFileName)
}

/**
 * Export as MP3 using lamejs library
 */
async function exportAsMp3(
  buffer: AudioBuffer,
  fileName: string,
  slice?: Slice,
  quality: number = 192,
  includeMetadata: boolean = true,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Convert quality (0-100) to bitrate (kbps)
      // Map: 50 = 128kbps, 75 = 192kbps, 90 = 256kbps, 100 = 320kbps
      const bitrate = quality <= 50 ? 128 : 
                      quality <= 75 ? 192 : 
                      quality <= 90 ? 256 : 320
      
      const sampleRate = buffer.sampleRate
      const numChannels = buffer.numberOfChannels
      const samples = buffer.length
      
      // Initialize MP3 encoder
      const mp3encoder = new Mp3Encoder(numChannels, sampleRate, bitrate)
      const mp3Data: Int8Array[] = []
      
      // Get channel data
      const leftChannel = buffer.getChannelData(0)
      const rightChannel = numChannels > 1 ? buffer.getChannelData(1) : leftChannel
      
      // Convert Float32Array to Int16Array
      const left = new Int16Array(samples)
      const right = new Int16Array(samples)
      
      for (let i = 0; i < samples; i++) {
        left[i] = leftChannel[i] * 0x7FFF
        right[i] = rightChannel[i] * 0x7FFF
      }
      
      // Encode in chunks with progress updates
      const chunkSize = 1152 // Standard MP3 frame size
      let offset = 0
      
      const encodeChunk = async () => {
        const end = Math.min(offset + chunkSize, samples)
        const leftChunk = left.subarray(offset, end)
        const rightChunk = right.subarray(offset, end)
        
        const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk)
        if (mp3buf.length > 0) {
          // Cast to any to accommodate encoder return type differences
          mp3Data.push(mp3buf as any)
        }
        
        offset = end
        
        // Update progress
        if (onProgress) {
          const progress = Math.min(95, Math.round((offset / samples) * 100))
          onProgress(progress)
        }
        
        // Continue encoding or finalize
        if (offset < samples) {
          // Use setTimeout to avoid blocking the UI
          setTimeout(encodeChunk, 0)
        } else {
          // Finalize encoding
          const mp3buf = mp3encoder.flush()
          if (mp3buf.length > 0) {
            mp3Data.push(mp3buf as any)
          }
          
          if (onProgress) onProgress(100)
          
          // Create blob
          let blob = new Blob(mp3Data, { type: 'audio/mp3' })
          
          // Add ID3 tags if metadata is enabled
          if (includeMetadata && slice) {
            try {
              const arrayBuffer = await blob.arrayBuffer()
              const writer = new (ID3Writer as any)(arrayBuffer)
              
              // Add title
              if (slice.title) {
                writer.setFrame('TIT2', slice.title)
              }
              
              // Add composers
              if (slice.composers && slice.composers.length > 0) {
                writer.setFrame('TCOM', slice.composers)
              }
              
              // Add performers/artists
              if (slice.performers && slice.performers.length > 0) {
                writer.setFrame('TPE1', slice.performers)
              }
              
              // Add genre (using type field)
              if (slice.type) {
                writer.setFrame('TCON', [slice.type])
              }
              
              // Add comments/notes
              if (slice.notes) {
                writer.setFrame('COMM', {
                  description: '',
                  text: slice.notes
                })
              }
              
              writer.addTag()
              blob = writer.getBlob()
            } catch (error) {
              console.warn('Failed to add ID3 tags:', error)
              // Continue with untagged MP3
            }
          }
          
          const finalFileName = fileName.replace(/\.(wav|mp3|webm|ogg|mp4)$/i, '') + '.mp3'
          downloadBlob(blob, finalFileName)
          resolve()
        }
      }
      
      // Start encoding
      encodeChunk()
    } catch (error) {
      console.error('Error in exportAsMp3:', error)
      reject(error)
    }
  })
}

/**
 * Download a blob as a file
 */
function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

/**
 * Legacy function for backwards compatibility
 */
export async function exportSliceAsWav(
  buffer: AudioBuffer,
  startTime: number,
  endTime: number,
  fileName: string,
  slice?: Slice
): Promise<void> {
  return exportSlice(buffer, startTime, endTime, fileName, slice, { 
    format: 'mp3', 
    quality: 90, 
    includeMetadata: true 
  })
}

/**
 * Export a full AudioBuffer as a WAV file
 */
export async function exportAudioBufferAsWav(
  buffer: AudioBuffer,
  fileName: string
): Promise<void> {
  const wavData = audioBufferToWav(buffer)
  const blob = new Blob([wavData], { type: 'audio/wav' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = fileName.endsWith('.wav') ? fileName : `${fileName}.wav`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  setTimeout(() => URL.revokeObjectURL(url), 100)
}
