import { AccountOperator } from '@main/db/operators/AccountOperator';
import { SettingsOperator } from './SettingsOperator';

const operators = {
  Account: AccountOperator,
  Settings: SettingsOperator,
};

export type OperatorsType = {
  [K in keyof typeof operators]: Omit<
    InstanceType<(typeof operators)[K]>,
    'Repository' | 'AppDataSource'
  >;
};

export { operators };
