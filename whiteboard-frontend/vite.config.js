import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  plugins: [react(), tailwindcss()],

  css: {
    preprocessorOptions: {
      // not required for Excalidraw, just FYI if you’re using SCSS etc.
    },
  },
})