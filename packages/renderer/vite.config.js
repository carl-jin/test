import react from '@vitejs/plugin-react';
import { chrome } from '../../.electron-vendors.cache.json';
import { description, version } from '../../package.json';
import { join, resolve } from 'node:path';
import { renderer } from 'unplugin-auto-expose';
import { createHtmlPlugin } from 'vite-plugin-html';

const PACKAGE_ROOT = __dirname;
const PROJECT_ROOT = join(PACKAGE_ROOT, '../..');

/**
 * @type {import('vite').UserConfig}
 * @see https://vitejs.dev/config/
 */
const config = {
  mode: process.env.MODE,
  root: PACKAGE_ROOT,
  envDir: PROJECT_ROOT,
  define: {
    'import.meta.env.isDev': process.env.MODE === 'development',
  },
  resolve: {
    alias: {
      '@renderer/': `${join(PACKAGE_ROOT, 'src')}/`,
      '@main/': `${resolve(PACKAGE_ROOT, '..', 'main', 'src')}`,
      '@mainTypes': `${resolve(PACKAGE_ROOT, '..', 'main', 'src', 'sharedTypes.ts')}`,
    },
  },
  base: '',
  server: {
    fs: {
      strict: true,
    },
  },
  build: {
    sourcemap: false,
    minify: true,
    target: `chrome${chrome}`,
    outDir: 'dist',
    assetsDir: '.',
    rollupOptions: {
      input: join(PACKAGE_ROOT, 'index.html'),
      output: {
        entryFileNames: `[name].js`,
        chunkFileNames: `[name].js`,
        assetFileNames: `[name].[ext]`,
        manualChunks(id, { getModuleInfo, getModuleIds }) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
    emptyOutDir: true,
    reportCompressedSize: false,
  },
  plugins: [
    react(),
    renderer.vite({
      preloadEntry: join(PACKAGE_ROOT, '../preload/src/index.ts'),
    }),
    createHtmlPlugin({
      inject: {
        data: {
          titleName: `${description} (v${version})`,
        },
      },
    }),
  ],
};

export default config;
