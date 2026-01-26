/**
 * Type definitions for browser-id3-writer
 */

declare module 'browser-id3-writer' {
  class ID3Writer {
    constructor(buffer: ArrayBuffer)
    
    setFrame(frameId: string, value: string | string[] | { description: string; text: string }): ID3Writer
    addTag(): void
    getBlob(): Blob
    getURL(): string
  }
  
  export = ID3Writer
}
