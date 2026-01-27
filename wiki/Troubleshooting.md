# Troubleshooting

## File System Access Permissions
- If files don't open, re-authorize access in browser prompt
- Re-import folders if handles are lost

## Waveform Not Rendering
- Wait for background worker to finish
- Large files take longer; keep the tab active
- Check DevTools console for errors

## MP3 Export Fails
- Try WAV export to confirm slice works
- Ensure browser supports required APIs

## Reset App Data
- Clear site data via browser DevTools (Application → Storage → Clear site data)
- Note: This deletes IndexedDB and local metadata
