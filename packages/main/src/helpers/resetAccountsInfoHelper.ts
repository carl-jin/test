import { db } from '@main/db/DBServer';
import { AccountStatusEnum } from '@main/db/types';

export function resetAccountsInfo() {
  db.Account.resetRunningAccountsStatus()
}