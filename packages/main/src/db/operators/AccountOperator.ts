import { Account } from '../entity/Account.entity';
import { DataSource, Repository, In } from 'typeorm';
import { AccountStatusEnum } from '../types';
import { IPC } from '@main/IPC';
import { taskManager } from '@main/modules/taskManager';
export class AccountOperator {
  Repository: Repository<Account>;
  AppDataSource: DataSource;

  constructor(source: DataSource) {
    this.AppDataSource = source;
    this.Repository = this.AppDataSource.getRepository(Account);
  }

  async getAllAccounts(): Promise<Account[]> {
    return await this.Repository.find();
  }

  async getAccountById(id: number): Promise<Account | null> {
    return await this.Repository.findOne({ where: { id } });
  }

  async getAccountsByIds(ids: number[]): Promise<Account[]> {
    return await this.Repository.find({ where: { id: In(ids) } });
  }

  async addAccounts(
    accounts: Pick<Account, 'email' | 'password' | 'twoFactorCode'>[],
  ): Promise<void> {
    // 检查是否有相同的email已存在
    const existingEmails = await this.Repository.find({
      where: {
        email: In(accounts.map((account) => account.email)),
      },
      select: ['email'],
    });

    const existingEmailSet = new Set(existingEmails.map((account) => account.email));

    // 过滤掉已存在的email，只添加新的账户
    const newAccounts = accounts.filter((account) => !existingEmailSet.has(account.email));

    if (newAccounts.length > 0) {
      await this.Repository.save(
        newAccounts.map((account) => ({
          ...account,
          status: AccountStatusEnum.WAITING,
          logs: '',
        })),
      );
    }
    IPC.send('accountDataChange');
  }

  async deleteAccounts(ids: number[]): Promise<void> {
    await this.Repository.delete(ids);
    taskManager.stopTaskByAccountIds(ids);
    IPC.send('accountDataChange');
  }

  async updateAccount(id: number, account: Partial<Account>): Promise<void> {
    await this.Repository.update(id, account);
    IPC.send('accountDataChange');
  }

  async updateAccountsInBulk(accounts: Partial<Account>[]): Promise<void> {
    // 逐个检查账户是否存在，只更新存在的账户
    for (const account of accounts) {
      if (account.id) {
        const existingAccount = await this.Repository.findOne({ where: { id: account.id } });
        if (existingAccount) {
          await this.Repository.update(account.id, account);
        }
      }
    }
    IPC.send('accountDataChange');
  }

  async resetRunningAccountsStatus() {
    await this.Repository.update(
      { status: In([AccountStatusEnum.RUNNING, AccountStatusEnum.WAITING_FOR_ACTION]) },
      { status: AccountStatusEnum.WAITING },
    );
  }
}
