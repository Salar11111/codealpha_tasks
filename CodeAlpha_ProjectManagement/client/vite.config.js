import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const port = Number(process.env.CLIENT_PORT || 5175);
const apiTarget = process.env.API_TARGET || 'http://localhost:5003';

export default defineConfig({
  plugins: [react()],
  server: {
    port,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      '/socket.io': { target: apiTarget, ws: true },
    },
  },
});
