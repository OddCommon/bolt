import path, { resolve } from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [],
  root: './_dev/',
  server: {
    host: true,
  },
  build: {
    outDir: `${path.resolve(__dirname, './dist')}`,
    rollupOptions: {
      input: require('fast-glob')
        .sync(['./_dev/**/*.html', '!dist'])
        .map(entry => path.resolve(__dirname, entry)),
    },
  },
  resolve: {
    alias: {
      '@scripts': `${path.resolve(__dirname, './_dev/scripts')}`,
      '@components': `${path.resolve(__dirname, './_dev/scripts/components')}`,
      '@styles': `${path.resolve(__dirname, './_dev/styles')}`,
      '@lib': `${path.resolve(__dirname, '../lib/index.js')}`,
    },
  },
});
