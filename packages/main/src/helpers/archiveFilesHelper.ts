import { createWriteStream, statSync, existsSync } from 'node:fs';
import archiver from 'archiver';
import { basename } from 'node:path';

export async function exportFiles(props: { files: string[]; output: string }) {
  return new Promise<void>((res, rej) => {
    // 创建一个可写流来写入 zip 文件
    const output = createWriteStream(props.output);
    const archive = archiver('zip');

    // 当打包完成时触发 'close' 事件
    output.on('close', function () {
      res();
    });

    // 当出现错误时触发 'error' 事件
    archive.on('error', function (err: any) {
      rej(err);
    });

    // 完成打包并关闭输出流
    archive.pipe(output);

    // 将指定文件夹添加到 zip 文件中
    for (let filePath of props.files) {
      if (existsSync(filePath)) {
        if (statSync(filePath).isFile()) {
          archive.file(filePath, { name: basename(filePath) });
        } else {
          archive.directory(filePath, basename(filePath));
        }
      }
    }

    archive.finalize();
  });
}
