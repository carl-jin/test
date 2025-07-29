import { app, shell, MenuItemConstructorOptions, MenuItem } from 'electron';
import { join } from 'node:path';
import { IPC } from '@mainIpc';
import { EVDCheckUpdate } from 'electron-version-deployer-cli/dist/main';
import { renderLog } from '@main/helpers/LogsHelper';
import { exportFiles } from '@main/helpers/archiveFilesHelper';

export function getMenu(): Array<MenuItemConstructorOptions | MenuItem> {
  return [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        {
          label: '撤销(revoke)',
          accelerator: 'CmdOrCtrl+Z',
          role: 'undo',
        },
        {
          label: '重做(redo)',
          accelerator: 'Shift+CmdOrCtrl+Z',
          role: 'redo',
        },
        {
          type: 'separator',
        },
        {
          label: '剪切(cut)',
          accelerator: 'CmdOrCtrl+X',
          role: 'cut',
        },
        {
          label: '复制(copy)',
          accelerator: 'CmdOrCtrl+C',
          role: 'copy',
        },
        {
          label: '粘贴(paste)',
          accelerator: 'CmdOrCtrl+V',
          role: 'paste',
        },
        {
          label: '全选(select all)',
          accelerator: 'CmdOrCtrl+A',
          role: 'selectAll',
        },
      ],
    },
    {
      label: '快捷操作',
      submenu: [
        {
          label: '打开控制台',
          accelerator: 'CmdOrCtrl+M',
          click: function (item: any, focusedWindow: any) {
            focusedWindow.toggleDevTools();
          },
        },
        {
          label: '打开app存储',
          accelerator: 'CmdOrCtrl+L',
          click: function () {
            const userDataPath = app.getPath('userData');
            renderLog(userDataPath);
            shell.openPath(userDataPath);
          },
        },
        {
          label: '检查是否有新版本',
          accelerator: 'CmdOrCtrl+U',
          click: function () {
            EVDCheckUpdate().then((isHaveNewVersion) => {
              if (!isHaveNewVersion) {
                IPC.send('showMessage', 'success', '当前已是最新版本！');
              }
            });
          },
        },
        {
          label: '导出数据文件',
          click: function () {
            const appPath = app.getAppPath();
            const userDataPath = app.getPath('userData');

            exportFiles({
              output: join(userDataPath, `数据文件 ${app.getVersion()}.zip`),
              files: [
                join(userDataPath, 'logs'),
                join(userDataPath, 'errors'),
                join(userDataPath, 'db.sqlite'),
                join(appPath, 'evdInstallerErrors.txt'),
              ],
            }).then(() => {
              shell.openPath(userDataPath).then(() => {
                IPC.send('showMessage', 'success', '导出成功');
              });
            });
          },
        },
      ],
    },
    {
      label: '窗口',
      role: 'window',
      submenu: [
        {
          label: '最小化(minimize)',
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize',
        },
        {
          label: '关闭(close)',
          accelerator: 'CmdOrCtrl+W',
          role: 'close',
        },
        {
          type: 'separator',
        },
      ],
    },
  ];
}
