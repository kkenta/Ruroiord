import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

export default defineConfig({
  plugins: [react()],
  base: './',
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  server: {
    port: 3000,
    host: true,
    https: {
      key: fs.readFileSync('./server/localhost-key.pem'),
      cert: fs.readFileSync('./server/localhost.pem')
    }
  }
}) 