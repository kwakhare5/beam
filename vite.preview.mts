import { defineConfig } from 'vite';

const root = import.meta.dirname;

export default defineConfig({
  root,
  server: {
    port: 5173
  }
});
