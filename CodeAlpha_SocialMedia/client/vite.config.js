import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const port = Number(process.env.CLIENT_PORT || 5174);
const apiTarget = process.env.API_TARGET || 'http://localhost:5002';

export default defineConfig({
  plugins: [react()],
  server: {
    port,
    proxy: {
      '/api': apiTarget,
      '/uploads': apiTarget,
      '/socket.io': { target: apiTarget, ws: true },
    },
  },
});
