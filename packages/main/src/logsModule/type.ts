import { LogLevel } from 'electron-log';

/**
 * 错误信息格式
 */
export type LogItemType = {
  data: string[];
  date: string[];
  level: LogLevel;
  timestamp: number;
  id: string;
};
