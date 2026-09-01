import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// בפריסה ל-GitHub Pages נדרש base של שם הריפו; בכל שאר הסביבות (dev/Vercel) שורש.
// אפשר לקבוע base מפורש (לפריסה בתת-תיקייה ב-gh-pages), אחרת שורש.
const env = globalThis.process?.env || {}
const base = env.PAGES_BASE || (env.GITHUB_PAGES === 'true' ? '/torah-transcription/' : '/')

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500,
  },
})
