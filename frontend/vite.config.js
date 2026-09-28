import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

// `vite --mode mock` (npm run dev:mock) swaps the Supabase data layer for an in-memory one so the
// app can be driven in tests without a real account. Production builds always use Supabase.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias:
      mode === 'mock'
        ? [{ find: /^(\.\.?\/)+data\/store$/, replacement: fileURLToPath(new URL('./src/data/mockStore.js', import.meta.url)) }]
        : [],
  },
  server: { port: 5173 },
  worker: { format: 'es' },
}));
