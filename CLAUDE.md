# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Client-only React + Vite SPA that transcribes Torah lessons in Hebrew or Yiddish. All UI is in Hebrew with `dir="rtl"` applied at the document root. Deployed to Vercel as a static SPA (see `vercel.json` — all routes rewrite to `/index.html`).

There is **no backend**: the browser calls Groq and Anthropic directly. The README.md in the repo is the unmodified Vite template — ignore it.

## Commands

```bash
npm run dev       # Vite dev server
npm run build     # production build → dist/
npm run lint      # ESLint (flat config, eslint.config.js)
npm run preview   # serve built dist/
```

No test runner is configured.

## Two-stage transcription pipeline

`src/utils/claudeApi.js` is the single entry point: `transcribeAudio({ ... })`.

1. **Groq Whisper** (`whisper-large-v3`) converts audio → raw text. For Yiddish, an explicit `language=yi` and a Torah-lesson `prompt` are passed to improve quality.
2. **Claude** (`claude-sonnet-4-5`) edits / formats the raw text. The prompt template depends on `transcriptionType`: `basic` | `extended` | `summary`, and on the `language` / `outputLanguage` pair (Yiddish lessons can be output as either Yiddish or translated Hebrew).

Important behavior:
- After the first Whisper call for a given audio file, the raw text is cached in `TranscriptionPage` state (`cachedRawText`) and reused for additional transcription types — only step 2 (Claude) re-runs.
- Claude is called with the `anthropic-dangerous-direct-browser-access: true` header. Do not remove this; without it CORS will fail.
- The model and API URLs are top-of-file constants in `claudeApi.js` — that is the place to change them.

## Claude output markup contract

Claude is instructed to use two markers that the rest of the app recognizes:
- `**heading**` — section headings (used by `extended` mode)
- `[source]` — citations / source references in square brackets

These three renderers must stay in sync when changing the markup:
- HTML preview: `TranscriptionResult.jsx` (regex `.replace(/\*\*(.+?)\*\*/g, ...)` and `[...]`)
- Word export: `utils/exportWord.js` — `buildParagraph` detects `**…**` headings and lines starting with `[…]`
- PDF/print: `utils/exportPdf.js` — `createPrintableElement` applies the same regex; `exportToPdf` rasterizes a DOM element by `id`

## State, navigation, and storage

- No router. `App.jsx` holds a `view` state (`'home' | 'transcription' | 'library'`) and the chosen lesson `language`. Navigation buttons mutate that state.
- The gate before the app renders is `ApiKeySetup`: if either `anthropicKey` or `groqKey` is missing from localStorage, only the setup modal renders. Keys are validated by prefix (`sk-ant-` / `gsk_`).
- All persistence is `localStorage` via `src/utils/storage.js` under fixed keys:
  - `torah_transcription_api_key`, `torah_transcription_groq_key` — API keys
  - `torah_transcription_library` — saved transcriptions (array of entries with id, date, name, maggid, topic, folder, tags, language, transcriptionType, text)
  - `torah_transcription_folders` — folder names
- The `.env.example` is informational only; `VITE_APP_TITLE` is not read anywhere. Do not add a backend-style env-key flow without removing the localStorage flow first.

## Audio upload constraints

`AudioUploader.jsx` enforces a 25 MB max file size — this matches Groq Whisper's upload limit. Accepted extensions: mp3, wav, m4a, ogg, webm. Change both the constant and the Groq API contract if relaxing.

## Styling

- Tailwind 3 with a custom palette in `tailwind.config.js`: `navy.*` (primary brand), `cream.*` (backgrounds), and font families `hebrew` / `serif` (Heebo + Frank Ruhl Libre, loaded from Google Fonts in `index.html`).
- Shared component classes live in `src/index.css` under `@layer components`: `.btn-primary`, `.btn-secondary`, `.card`, `.input-field`, `.section-title`, `.progress-bar-track`, `.progress-bar-fill`. Prefer reusing these over inventing new class combos.
- The whole document is RTL; when adding flex/grid layouts remember that `gap-x` directions follow RTL.

## Conventions worth knowing

- Components and pages are `.jsx` (no TypeScript). React 19 + the new JSX transform — no `import React` needed.
- All user-facing strings are Hebrew literals inline in JSX. There is no i18n layer; do not introduce one casually.
- The auto-download of a Word doc on a successful transcription (in `TranscriptionPage.handleTranscribe`) is intentional; the wrapping `try/catch` swallows export errors so a failed download does not lose the transcription.
- `vite.config.js` sets `chunkSizeWarningLimit: 1500` because `docx` + `jspdf` + `html2canvas` are large. Don't add code-splitting unless the user asks — the app is one screen at a time.

## Git workflow for this environment

Develop on the branch designated by the session instructions (currently `claude/claude-md-docs-2Lk5t`). Push with `git push -u origin <branch>`. Do not open PRs unless explicitly asked.
