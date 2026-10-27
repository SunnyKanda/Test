import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5173 },
  resolve: {
    alias: {
      // Use the pre-built browser bundle instead of Node.js source
      webtorrent: path.resolve(__dirname, 'node_modules/webtorrent/dist/webtorrent.min.js'),
    },
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
  },
});
