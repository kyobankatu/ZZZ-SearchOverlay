# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start        # Run the Electron app in development
npm run build    # Build Windows NSIS installer via electron-builder
```

No linter or test runner is configured.

## Mandatory Rules for Claude Code

- Do NOT modify any files unless explicitly instructed.
- Do NOT refactor existing code unless clearly requested.
- Prefer minimal, localized changes over large improvements.
- Stability and existing behavior are more important than code cleanliness.

## Change Proposal Requirement

Before making any code changes:
- Explain what will be changed
- Explain why it is necessary
- Describe potential risks or side effects

Wait for explicit approval before proceeding.

## Security Rules

- Never request or output secrets, API keys, or credentials.
- Do not log or print personal data.
- Assume production-like constraints even in development.

## Cost Awareness

- Keep responses concise.
- Avoid repeating large code blocks unless necessary.
- Prefer explanation over full implementation when possible.

## Notation

- Indent must be 4
- Don't insert extra spaces
- Don't omit "{}"
- Don't use left symbol like ">" and ">=". Please use right synbol like "<" and "<="
- Avoid using goto
- Consider readability

This is an **Electron desktop overlay** for the game Zenless Zone Zero. It provides two search modes (text query and screenshot area scan) backed by a separate local API server (default: `http://localhost:5000`).

### Multi-Window Design

**Main overlay window** (`main.js` + `renderer/`) — transparent, frameless, always-on-top, toggled by `Ctrl+Shift+Z`.

**Capture window** (`capture/`) — temporary full-screen overlay for rubber-band area selection. Created on demand, destroyed after use.

### IPC Flow

All cross-window communication goes through Electron IPC. Preload scripts expose a minimal API via `contextBridge` (Node integration is disabled, context isolation is enabled).

Area search flow:
1. Renderer calls `electronAPI.startAreaCapture()` → main hides overlay, takes a screenshot with `desktopCapturer`
2. Main creates the capture window and sends the screenshot via `captureAPI.onScreenshot()`
3. User draws a selection; `capture.js` crops the canvas and calls `captureAPI.submitSelection(dataUrl)`
4. Main receives `area-selected`, closes capture window, forwards cropped image to renderer via `electronAPI.onScanImage()`
5. Renderer POSTs the image blob to `/scan` endpoint and renders results

Text search POSTs to `/get_info`. Both endpoints are on the backend API server — **this repo does not include the backend**.

### Key Files

| File | Role |
|------|------|
| `main.js` | Main process: window lifecycle, hotkey, IPC handlers, screenshot |
| `preload.js` | Context bridge for main renderer |
| `capture-preload.js` | Context bridge for capture window |
| `renderer/renderer.js` | UI logic: tab switching, API calls, result rendering |
| `capture/capture.js` | Canvas-based area selection with visual feedback |

## Model Usage Policy

- Use the Default (recommended) model for all tasks.
- The Default model is currently Sonnet.
- Do NOT switch to Opus unless explicitly instructed by the user.
- Prefer lower-cost models unless higher capability is required.