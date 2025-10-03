import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 3000,
    https: false
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
