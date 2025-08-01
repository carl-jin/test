import { AccountOperator } from '@main/db/operators/AccountOperator';
import { SettingsOperator } from './SettingsOperator';
import { DownloadHistoryOperator } from './DownloadHistory';

const operators = {
  Account: AccountOperator,
  Settings: SettingsOperator,
  DownloadHistory: DownloadHistoryOperator,
};

export type OperatorsType = {
  [K in keyof typeof operators]: Omit<
    InstanceType<(typeof operators)[K]>,
    'Repository' | 'AppDataSource'
  >;
};

export { operators };
