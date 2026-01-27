import { Capacitor } from '@capacitor/core'
import { FilePicker } from '@capawesome/capacitor-file-picker'

export interface PickedAudioFile {
  name: string
  uri?: string
  path?: string
  mimeType?: string
}

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

export async function pickAudioFilesNative(): Promise<PickedAudioFile[]> {
  const result = await FilePicker.pickFiles({
    multiple: true,
    types: ['audio/*']
  })
  return (result.files || []).map(f => ({
    name: f.name,
    uri: (f as any).uri,
    path: (f as any).path,
    mimeType: f.mimeType
  }))
}
