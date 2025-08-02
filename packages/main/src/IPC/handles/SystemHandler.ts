import { IPCMain } from '@main/IPC/IPCMain';
import { MainMessage, RenderMessage } from '@main/IPC/messageType';
import { app, dialog, shell } from 'electron';
import { existsSync, rmSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { platform } from 'node:process';
import { taskManager } from '@main/modules/taskManager';

export function SystemHandler(IPC: IPCMain<RenderMessage, MainMessage>) {
  IPC.on('openLink', async (link) => {
    shell.openExternal(link);
  });

  IPC.on('getInjectGlobalVars', async () => {
    return {
      userDataFolder: join(app.getPath('userData')),
    };
  });

  IPC.on('guessChromeExecutablePath', () => {
    return guessChromeExecutablePath();
  });

  IPC.on('browserPathExistAndExecutable', async (path) => {
    return Promise.resolve(detectBrowserIsExecutable(path));
  });

  IPC.on('runAccountsByIDs', async (ids, type) => {
    taskManager.run(ids, type);
  });

  IPC.on('bringBrowserToFrontByAccountId', async (id) => {
    taskManager.bringBrowserToFrontByAccountId(id);
  });

  IPC.on('checkFileExist', async (filePath) => {
    return Promise.resolve(existsSync(filePath));
  });

  IPC.on('showFileInFinder', async (filePath) => {
    shell.showItemInFolder(filePath);
  });
}

/**
 * 尝试根据系统猜测 chrome 可执行文件位置
 */
function guessChromeExecutablePath(): Promise<string | undefined> {
  const map: Partial<Record<typeof platform, string[]>> = {
    win32: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ],
    darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
    linux: ['/usr/bin/google-chrome'],
  };

  const paths = map[platform];
  if (paths) {
    //  判断文件夹是否存在
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];

      if (existsSync(path)) {
        return Promise.resolve(path);
      }
    }
  }

  return Promise.resolve(undefined);
}

export function detectBrowserIsExecutable(path?: string): true {
  if (!path) throw new Error(`浏览器可执行路径不存在！${path}`);
  if (!existsSync(path)) throw new Error(`浏览器可执行路径不存在！${path}`);
  if (!statSync(path).isFile()) throw new Error(`浏览器可执行路径错误（不是文件）！${path}`);
  if (!~basename(path).toLowerCase().indexOf('chrome'))
    throw new Error(`浏览器可执行路径错误（非 chrome 命名）！${path}`);

  return true;
}
