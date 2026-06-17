import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Dev-only: forward /api to the local backend so the app can use relative URLs
  // (VITE_API_URL=/api) in every environment. Not part of the production build.
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    // Split heavy/rarely-used libraries into their own chunks so they are only
    // downloaded when a page that needs them is opened (and cached separately).
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf': ['jspdf', 'html2canvas'],
          'maps': ['leaflet', 'react-leaflet'],
          'vendor': ['react', 'react-dom', 'react-router-dom', 'zustand'],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
})
