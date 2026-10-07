import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// OpenAudioBooks Alpha 0.1.0
// Conservative static frontend build. No backend, no external services.
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: true,
  },
  server: {
    port: 5173,
  },
});
