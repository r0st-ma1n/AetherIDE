import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import fs from 'node:fs';
import path from 'node:path';

function copyTemplatesPlugin() {
  return {
    name: 'copy-templates',
    closeBundle() {
      const srcDir = path.resolve(__dirname, 'src/domains/templates/assets');
      const destDir = path.resolve(__dirname, 'dist/templates');
      if (fs.existsSync(srcDir)) {
        fs.mkdirSync(destDir, { recursive: true });
        fs.cpSync(srcDir, destDir, { recursive: true });
      }
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [vue(), copyTemplatesPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
  },
});

