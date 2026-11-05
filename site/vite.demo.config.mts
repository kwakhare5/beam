import { defineConfig } from 'vite';

export default defineConfig({
  root: 'demo',
  base: '/demo/',
  build: {
    outDir: '../public/demo',
    emptyOutDir: true,
    target: 'es2022'
  }
});
