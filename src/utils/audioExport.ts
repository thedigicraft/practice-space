/**
 * Audio export utilities
 * Handles exporting audio slices as WAV files
 */

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
 * Export an AudioBuffer slice as a WAV file
 */
export async function exportSliceAsWav(
  buffer: AudioBuffer,
  startTime: number,
  endTime: number,
  fileName: string
): Promise<void> {
  // Extract the slice
  const sliceBuffer = extractSlice(buffer, startTime, endTime)
  
  // Convert to WAV
  const wavData = audioBufferToWav(sliceBuffer)
  
  // Create blob and download
  const blob = new Blob([wavData], { type: 'audio/wav' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = fileName.endsWith('.wav') ? fileName : `${fileName}.wav`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 100)
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
