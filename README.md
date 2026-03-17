# ZZZ Search Overlay

An Electron desktop overlay for **Zenless Zone Zero** that lets you quickly look up game terms while playing. Supports text search and screenshot-based area scan, powered by a local API server.

## Features

- **Text Search** — type a ZZZ term and get info + related links from the local API
- **Area Search** — drag a selection on the game screen; the overlay OCR-scans it and detects ZZZ terms
- Always-on-top transparent window, toggled by `Ctrl+Shift+Z`
- Draggable window; works over the game in borderless windowed mode

## Requirements

- [Node.js](https://nodejs.org/) (for development)
- A local API server running at `http://localhost:5000` (not included in this repo)
  - `POST /get_info` — body: `{ "word": "..." }` → returns term info
  - `POST /scan` — multipart form with `image` field → returns `{ "filtered_in": [...] }`

## Setup

```bash
npm install
```

## Usage

### Development

```bash
npm start
```

### Build (Windows installer)

```bash
npm run build
```

Produces a Windows NSIS installer via electron-builder.

## Hotkey

| Key | Action |
|-----|--------|
| `Ctrl+Shift+Z` | Show / hide the overlay |
| `Esc` | Cancel area selection |

## How Area Search Works

1. Click **Select Area on Screen** — the overlay hides and takes a full screenshot
2. A full-screen capture window appears; drag to draw a selection rectangle
3. The cropped image is sent to `POST /scan`
4. Detected ZZZ terms are listed; click any term to jump to Text Search

> ZZZ must be running in **borderless windowed** mode for area capture to work correctly.

## Project Structure

```
main.js               Main process — window lifecycle, hotkey, IPC, screenshot
preload.js            Context bridge for the main renderer
capture-preload.js    Context bridge for the capture window
renderer/
  index.html          Overlay UI
  renderer.js         Tab switching, API calls, result rendering
  style.css           Overlay styles
capture/
  capture.html        Full-screen capture UI
  capture.js          Canvas rubber-band selection
  capture.css         Capture window styles
```

## License

This project is for personal use as a game companion tool.
