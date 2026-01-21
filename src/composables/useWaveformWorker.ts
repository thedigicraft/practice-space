/**
 * Composable for managing waveform worker
 */

import WaveformWorker from '../workers/waveform.worker?worker'

interface WaveformWorkerMessage {
  type: 'complete' | 'error'
  waveformData?: Float32Array
  error?: string
}

export function useWaveformWorker() {
  const worker = new WaveformWorker()

  const generateWaveform = (
    audioBuffer: AudioBuffer,
    samplesPerPixel: number
  ): Promise<Float32Array> => {
    return new Promise((resolve, reject) => {
      const handleMessage = (e: MessageEvent<WaveformWorkerMessage>) => {
        if (e.data.type === 'complete' && e.data.waveformData) {
          worker.removeEventListener('message', handleMessage)
          resolve(e.data.waveformData)
        } else if (e.data.type === 'error') {
          worker.removeEventListener('message', handleMessage)
          reject(new Error(e.data.error || 'Unknown worker error'))
        }
      }

      worker.addEventListener('message', handleMessage)

      // Extract channel data to send to worker (AudioBuffer can't be cloned)
      const channelData = audioBuffer.getChannelData(0)
      
      worker.postMessage({
        type: 'generate',
        channelData,
        sampleRate: audioBuffer.sampleRate,
        samplesPerPixel,
      }, [channelData.buffer])
    })
  }

  const terminate = () => {
    worker.terminate()
  }

  return {
    generateWaveform,
    terminate,
  }
}
