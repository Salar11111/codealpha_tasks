import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const port = Number(process.env.CLIENT_PORT || 5173);
const apiTarget = process.env.API_TARGET || 'http://localhost:5001';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port,
    proxy: {
      '/api': apiTarget,
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
  },
});
