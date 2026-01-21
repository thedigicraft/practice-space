/**
 * Web Worker for generating waveform visualization data
 * 
 * This worker processes audio files in the background to create
 * downsampled waveform data for visualization without blocking the UI.
 */

interface WaveformRequest {
  type: 'generate'
  channelData: Float32Array
  sampleRate: number
  samplesPerPixel: number
}

interface WaveformResponse {
  type: 'complete' | 'error'
  waveformData?: Float32Array
  error?: string
}

self.onmessage = async (e: MessageEvent<WaveformRequest>) => {
  const { type, channelData, samplesPerPixel } = e.data

  if (type === 'generate') {
    try {
      const waveformData = generateWaveform(channelData, samplesPerPixel)
      
      const response: WaveformResponse = {
        type: 'complete',
        waveformData,
      }
      
      self.postMessage(response, [waveformData.buffer])
    } catch (error) {
      const response: WaveformResponse = {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
      
      self.postMessage(response)
    }
  }
}

/**
 * Generate downsampled waveform data for visualization
 * Takes the average peak amplitude for each pixel-width slice of audio
 */
function generateWaveform(
  channelData: Float32Array,
  samplesPerPixel: number
): Float32Array {
  const totalSamples = channelData.length
  const numPixels = Math.ceil(totalSamples / samplesPerPixel)
  const waveformData = new Float32Array(numPixels)

  for (let i = 0; i < numPixels; i++) {
    const start = i * samplesPerPixel
    const end = Math.min(start + samplesPerPixel, totalSamples)
    
    let max = 0
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j])
      if (abs > max) {
        max = abs
      }
    }
    
    waveformData[i] = max
  }

  return waveformData
}

export {}
