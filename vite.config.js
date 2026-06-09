import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// בפריסה ל-GitHub Pages נדרש base של שם הריפו; בכל שאר הסביבות (dev/Vercel) שורש.
const base = process.env.GITHUB_PAGES === 'true' ? '/torah-transcription/' : '/'

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500,
  },
})
