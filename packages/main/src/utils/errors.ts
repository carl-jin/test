import { app } from 'electron';
import { appendFileSync, existsSync, mkdirSync, truncateSync, statSync } from 'node:fs';
import { join } from 'node:path';

//  判断文件夹是否存在
const errorsFolderPath = join(app.getPath('userData'), 'errors');
const runtimeErrorFilePath = join(errorsFolderPath, 'runtimeError.txt');
const ipcErrorFilePath = join(errorsFolderPath, 'ipcError.txt');
const evdErrorFilePath = join(errorsFolderPath, 'evd.txt');

//  如果文件夹不存在就创建
!existsSync(errorsFolderPath) && mkdirSync(errorsFolderPath);

type ErrorType = 'runtime' | 'ipc' | 'evd';

export function writeError(error: any, type: ErrorType = 'runtime') {
  const filePath = {
    runtime: runtimeErrorFilePath,
    ipc: ipcErrorFilePath,
    evd: evdErrorFilePath,
  };

  const _path = filePath[type] ?? filePath.runtime;

  //  如果文件过长就清空
  if (existsSync(_path)) {
    const fileSizeInMegabytes = statSync(_path).size / (1024 * 1024);

    //  超过 1m 清空下
    if (fileSizeInMegabytes > 1) {
      truncateSync(_path, 0);
    }
  }

  appendFileSync(
    _path,
    `
    ${new Date().toString()}\n
    ${error.toString()}\n
    -- stack\n
    ${error.stack}\n
    ----------------------------------------------------------------\n
  `,
  );
}
