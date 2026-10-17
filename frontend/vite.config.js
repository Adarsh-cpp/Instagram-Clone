import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    // Prevents two copies of React/three being bundled (breaks r3f hooks)
    dedupe: ['react', 'react-dom', 'three'],
  },

  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Keeps the heavy 3D libraries in their own chunks. They are only
        // fetched when Devs Mode is switched on.
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
          motion: ['framer-motion'],
        },
      },
    },
  },
})