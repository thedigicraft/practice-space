/**
 * Recording service for capturing audio from microphone
 */

export type RecordingSession = {
  stream: MediaStream
  recorder: MediaRecorder
}

export function isRecordingSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices && typeof MediaRecorder !== 'undefined'
}

export async function listInputDevices(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return []
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.filter((d) => d.kind === 'audioinput')
}

export function getPreferredMimeType(): string | undefined {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/wav',
  ]
  for (const t of candidates) {
    try {
      if ((MediaRecorder as any).isTypeSupported?.(t)) return t
    } catch {}
  }
  return undefined
}

export async function startRecording(deviceId?: string): Promise<RecordingSession> {
  if (!isRecordingSupported()) throw new Error('Recording not supported')

  const constraints: MediaStreamConstraints = {
    audio: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 2,
      sampleRate: undefined,
    },
    video: false,
  }

  const stream = await navigator.mediaDevices.getUserMedia(constraints)
  const mimeType = getPreferredMimeType()
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
  return { stream, recorder }
}

export async function stopRecording(session: RecordingSession): Promise<Blob> {
  const { recorder, stream } = session
  const chunks: BlobPart[] = []

  await new Promise<void>((resolve, reject) => {
    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) chunks.push(e.data)
    }
    recorder.onerror = (e) => reject(e.error ?? new Error('Recorder error'))
    recorder.onstop = () => resolve()
    try {
      recorder.stop()
    } catch (e) {
      reject(e as Error)
    }
  })

  // Clean up stream tracks
  stream.getTracks().forEach((t) => t.stop())

  const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
  return blob
}
