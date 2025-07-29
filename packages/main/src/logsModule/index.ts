import { IPC } from '@main/IPC';
import { app } from 'electron';
import logger from 'electron-log';
import { join } from 'node:path';
import dayjs from 'dayjs';

logger.transports.file.level = 'silly';
logger.transports.file.format = (info) => {
  //  @ts-ignore
  info.date = dayjs(info.date).format('YYYY-MM-DD HH:mm:ss');
  //  @ts-ignore
  info.timestamp = dayjs(info.date).unix();
  //  @ts-ignore
  info.id = info.timestamp + Math.ceil(Math.random() * 99999);
  return JSON.stringify(info);
};
//  账号日志为 1m
logger.transports.file.maxSize = 1024 * 1024;
logger.transports.file.inspectOptions = { depth: 2 };
logger.transports.file.resolvePath = (_) => {
  return join(app.getPath('userData'), `logs`, `log.log`);
};
logger.hooks.push((message) => {
  //  如果有 error 错误，向渲染进程报告
  if (message.level === 'error') {
    IPC.send('haveNewError').then();
  }

  return message;
});

export default logger;
