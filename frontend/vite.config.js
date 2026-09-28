import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `vite build --mode demo` produces a standalone build whose API runs in the browser
// (src/services/browserApi.js); see scripts/build-demo.mjs.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    __BROWSER_DEMO__: JSON.stringify(mode === 'demo'),
  },
  build:
    mode === 'demo'
      ? { outDir: 'dist-demo', rolldownOptions: { output: { codeSplitting: false } } }
      : undefined,
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
}));
