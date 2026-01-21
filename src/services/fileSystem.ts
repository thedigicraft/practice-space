/**
 * File System Access API service
 * 
 * Handles importing audio files and folders using the modern
 * File System Access API for persistent access to files.
 */

/**
 * Check if File System Access API is supported
 */
export function isFileSystemAccessSupported(): boolean {
  return 'showOpenFilePicker' in window && 'showDirectoryPicker' in window
}

/**
 * Open file picker to select audio files
 */
export async function pickAudioFiles(): Promise<FileSystemFileHandle[]> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API is not supported')
  }

  const handles = await window.showOpenFilePicker({
    multiple: true,
    types: [
      {
        description: 'Audio Files',
        accept: {
          'audio/*': ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'],
        },
      },
    ],
  })

  return handles
}

/**
 * Open directory picker to import a folder of audio files
 */
export async function pickAudioDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API is not supported')
  }

  const dirHandle = await window.showDirectoryPicker()
  return dirHandle
}

/**
 * Recursively get all audio files from a directory
 */
export async function getAllAudioFiles(
  dirHandle: FileSystemDirectoryHandle
): Promise<FileSystemFileHandle[]> {
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac']
  const files: FileSystemFileHandle[] = []

  async function traverse(dir: FileSystemDirectoryHandle) {
    for await (const entry of dir.values()) {
      if (entry.kind === 'file') {
        const fileHandle = entry as FileSystemFileHandle
        const isAudio = audioExtensions.some((ext) =>
          fileHandle.name.toLowerCase().endsWith(ext)
        )
        if (isAudio) {
          files.push(fileHandle)
        }
      } else if (entry.kind === 'directory') {
        await traverse(entry as FileSystemDirectoryHandle)
      }
    }
  }

  await traverse(dirHandle)
  return files
}

/**
 * Get a File object from a FileSystemFileHandle
 */
export async function getFileFromHandle(
  handle: FileSystemFileHandle
): Promise<File> {
  // Request permission if needed
  const hasPermission = await requestReadPermission(handle)
  if (!hasPermission) {
    throw new Error('Permission denied to read file')
  }
  return handle.getFile()
}

/**
 * Request permission to read a file handle
 */
export async function requestReadPermission(
  handle: FileSystemFileHandle
): Promise<boolean> {
  const permission = await handle.queryPermission({ mode: 'read' })
  if (permission === 'granted') {
    return true
  }

  if (permission === 'prompt') {
    const result = await handle.requestPermission({ mode: 'read' })
    return result === 'granted'
  }

  return false
}
