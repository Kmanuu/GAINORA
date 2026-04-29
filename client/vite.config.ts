import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Subir umbral de warning: 600KB es estándar para apps React medianas.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // Vendor chunks separados → cache largo, descarga paralela.
          if (id.includes('react-router')) return 'vendor-router';
          if (id.includes('react-dom')) return 'vendor-react-dom';
          if (id.includes('node_modules/react/')) return 'vendor-react';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('clsx') || id.includes('tailwind')) return 'vendor-style';
          return 'vendor';
        },
      },
    },
  },
})
