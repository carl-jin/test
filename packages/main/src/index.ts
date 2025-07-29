import { DBServer } from '@main/db/DBServer';
import { restoreOrCreateWindow } from '@main/mainWindow.js';
import './security-restrictions';
import { app } from 'electron';
import { platform } from 'node:process';
import path from 'path';
import { IPC } from './IPC';
import { InitIPCHandler } from '@main/IPC/handles';
import { EVDInit } from 'electron-version-deployer-cli/dist/main';
import { join } from 'node:path';
import { writeError } from '@main/utils/errors';
import { resetAccountsInfo } from './helpers/resetAccountsInfoHelper';

/**
 * Prevent electron from running multiple instances.
 */
const isSingleInstance = app.requestSingleInstanceLock();
if (!isSingleInstance) {
  app.quit();
  process.exit(0);
}
app.on('second-instance', restoreOrCreateWindow);

/**
 * Disable Hardware Acceleration to save more system resources.
 */
app.disableHardwareAcceleration();

/**
 * Shout down background process if all windows was closed
 */
app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    DBServer.close();
    app.quit();
  }
});

/**
 * @see https://www.electronjs.org/docs/latest/api/app#event-activate-macos Event: 'activate'.
 */
app.on('activate', restoreOrCreateWindow);

/**
 * Create the application window when the background process is ready.
 */
app
  .whenReady()
  .then(() => {
    if (!import.meta.env.isDev) {
      EVDInit({
        remoteUrl: `https://auto-login-software-main.pages.dev`,
        logo: `file://${join(app.getAppPath(), 'packages', 'main', 'dist', 'icon.png')}`,
        onError(error) {
          //  记录更新检测遇到的错误
          writeError(error, 'evd');
        },
        onBeforeNewPkgInstall(next, version: string) {
          next();
        },
      });
    }

    return DBServer.init(path.join(app.getPath('userData'), 'db.sqlite')).then(() => {
      InitIPCHandler(IPC);
      resetAccountsInfo()
      return restoreOrCreateWindow();
    });
  })
  .catch((e) => console.error('Failed create window:', e));

/**
 * Install Vue.js or any other extension in development mode only.
 * Note: You must install `electron-devtools-installer` manually
 */
// if (import.meta.env.DEV) {
//   app
//     .whenReady()
//     .then(() => import('electron-devtools-installer'))
//     .then(module => {
//       const {default: installExtension, VUEJS_DEVTOOLS} =
//         //@ts-expect-error Hotfix for https://github.com/cawa-93/vite-electron-builder/issues/915
//         typeof module.default === 'function' ? module : (module.default as typeof module);
//
//       return installExtension(VUEJS_DEVTOOLS, {
//         loadExtensionOptions: {
//           allowFileAccess: true,
//         },
//       });
//     })
//     .catch(e => console.error('Failed install extension:', e));
// }
