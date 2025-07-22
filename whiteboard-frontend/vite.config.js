import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  css: {
    preprocessorOptions: {
      // not required for Excalidraw, just FYI if you’re using SCSS etc.
    },
  },
})