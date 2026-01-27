# Exporting Audio

## Formats
- **WAV**: Instant, lossless
- **MP3**: Compressed using `@breezystack/lamejs`; ID3 tags via `browser-id3-writer`

## Export Menu
- Use the export dropdown to choose WAV or MP3
- Provide metadata for MP3 tags: title, artist, album, comments

## Batch Export
- In folder view, select multiple slices using the selection toolbar
- Export all selected at once

## Notes
- MP3 support depends on browser capabilities
- Exports save to your local file system via File System Access API
