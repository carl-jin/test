import { node } from '../../.electron-vendors.cache.json';
import { isDevBranch } from '../../scripts/utils';
import { injectAppVersion } from '../../version/inject-app-version-plugin.mjs';
import dotenv from 'dotenv';
import { join, resolve } from 'node:path';

const PACKAGE_ROOT = __dirname;
const PROJECT_ROOT = join(PACKAGE_ROOT, '../..');
const env = dotenv.config({ path: resolve(PROJECT_ROOT, '../../.env') }).parsed;

/**
 * @type {import('vite').UserConfig}
 * @see https://vitejs.dev/config/
 */
const config = {
  mode: process.env.MODE,
  root: PACKAGE_ROOT,
  envDir: PROJECT_ROOT,
  define: {
    'import.meta.env.REMOTE_URL': `"${
      isDevBranch() ? env.CLOUDFLARE_DEV_URL : env.CLOUDFLARE_MAIN_URL
    }"`,
    'import.meta.env.isDev': process.env.MODE === 'development',
  },
  resolve: {
    alias: {
      '@mainLogs': `${join(PACKAGE_ROOT, 'src', 'logsModule', 'index.ts')}`,
      '@mainIpc': `${join(PACKAGE_ROOT, 'src', 'IPC', 'index.ts')}`,
      '@mainDb': `${join(PACKAGE_ROOT, 'src', 'db', 'DBServer.ts')}`,
      '@mainTypes': `${resolve(PACKAGE_ROOT, 'src', 'sharedTypes.ts')}/`,
      '@main/': `${join(PACKAGE_ROOT, 'src')}/`,
      '@PH/': `${resolve(PACKAGE_ROOT, '..', 'puppeteer-helpers', 'src')}/`,
    },
  },
  build: {
    ssr: true,
    sourcemap: false,
    target: `node${node}`,
    outDir: 'dist',
    assetsDir: '.',
    minify: false,
    lib: {
      entry: ['src/index.ts'],
      formats: ['cjs'],
    },
    rollupOptions: {
      output: {
        entryFileNames: '[name].cjs',
      },
    },
    emptyOutDir: false,
    reportCompressedSize: false,
  },
  plugins: [injectAppVersion()],
};

export default config;
