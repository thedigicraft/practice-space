# FAQ

## Does this app upload my audio?
No. Audio files never leave your device. The app only stores metadata and references to files locally.

## Which browsers are supported?
Chromium-based browsers (Chrome, Edge, Opera) with File System Access API. Firefox and Safari currently lack full support.

## Can I move my library to another machine?
Currently the app is local-only. Exporting metadata is planned. You can re-import audio on another machine.

## Are original files modified?
Never. Slices are metadata-only pointing to time ranges within your audio files.

## Can I export with tags?
Yes, MP3 exports include ID3 tags (title, artist, album, comments). WAV is metadata-light but lossless.

## How big can my library be?
IndexedDB can store large amounts of data. Practical limits depend on your browser and disk.
