import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  
  plugins: [react()],
  server: {
    port: 3000,
    open: '/index.html'
  },
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@pages': '/src/pages',
      '@services': '/src/services',
      '@utils': '/src/utils',
      '@styles': '/src/styles',
      '@assets': '/src/assets',
      '@contexts': '/src/contexts',
      '@hooks': '/src/hooks'
    }
  }
})
