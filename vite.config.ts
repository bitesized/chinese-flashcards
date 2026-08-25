import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Minimal Vite config for the app shell. PWA support (vite-plugin-pwa) is
// added in the work order that makes offline caching meaningful (M4+) —
// see conventions.md §1 and architecture.md §3.
export default defineConfig({
  plugins: [react()],
});
