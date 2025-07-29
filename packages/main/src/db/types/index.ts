export enum AccountStatusEnum {
  WAITING = 'waiting',
  RUNNING = 'running',
  WAITING_FOR_ACTION = 'waiting_for_action',
  ERROR = 'error',
  SUCCESS = 'success',
}

export type SettingsType = {
  chromeExecutablePath: string;
  runFlag: boolean;
};