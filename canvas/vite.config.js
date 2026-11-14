import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  base: '/studio/',
  build: { outDir: '../studio', emptyOutDir: false, assetsDir: 'assets/canvas' },
});
