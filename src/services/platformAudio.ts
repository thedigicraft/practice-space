import { Capacitor } from '@capacitor/core'
import { Filesystem } from '@capacitor/filesystem'
import type { Source } from '@/types/models'
import { getFileFromHandle } from '@/services/fileSystem'

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary')
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

export async function getSourceArrayBuffer(source: Source): Promise<ArrayBuffer> {
  // In-app clip blob
  if (source.blob) {
    return source.blob.arrayBuffer()
  }
  // Web/Desktop path
  if (source.fileHandle) {
    const file = await getFileFromHandle(source.fileHandle)
    return file.arrayBuffer()
  }

  // Android native path
  if (Capacitor.isNativePlatform() && source.androidUri) {
    const result = await Filesystem.readFile({
      path: source.androidUri,
      // Ensure we get base64 string
      encoding: 'base64'
    })
    return base64ToArrayBuffer(result.data)
  }

  throw new Error('No available file handle or Android URI for source')
}
