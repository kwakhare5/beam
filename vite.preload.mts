import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const root = import.meta.dirname;

export default defineConfig({
  build: {
    outDir: resolve(root, 'dist/preload'),
    emptyOutDir: false,
    sourcemap: true,
    minify: false,
    lib: {
      entry: resolve(root, 'src/preload/index.ts'),
      formats: ['cjs'],
      fileName: () => 'index.js'
    },
    rollupOptions: {
      external: ['electron']
    }
  }
});
