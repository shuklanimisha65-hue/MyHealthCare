import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main:             path.resolve(__dirname, 'index.html'),
        login:            path.resolve(__dirname, 'login.html'),
        register:         path.resolve(__dirname, 'register.html'),
        dashboard:        path.resolve(__dirname, 'dashboard.html'),
        profile:          path.resolve(__dirname, 'profile.html'),
        consultation:     path.resolve(__dirname, 'consultation.html'),
        settings:         path.resolve(__dirname, 'settings.html'),
      }
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    }
  }
})
