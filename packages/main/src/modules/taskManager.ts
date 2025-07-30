import { renderLog } from '@main/helpers/LogsHelper';
import { db } from '@main/db/DBServer';
import { AccountStatusEnum } from '@main/db/types';
import { Account } from '@main/db/entity';
import { sample, uniqBy, isEqual } from 'lodash';
import { BrowserSession, loginWithGoogle } from './LoginWIthGoogle';
import { killChromeBrowserByWindowname } from '@main/helpers/browserKillHelper';
import { bringToFront } from '@main/helpers/bringToFrontHelper';

let oldUpdate: Array<{
  id: number;
  status: AccountStatusEnum;
}> = [];

export class TaskManager {
  private accountMap: Map<
    Account['id'],
    {
      account: Account;
      status: AccountStatusEnum;
      browserSession?: BrowserSession;
      // 执行顺序
      order: number;
    }
  > = new Map();

  private checkInterval: NodeJS.Timeout | null = null;
  private statusUpdateInterval: NodeJS.Timeout | null = null;
  private isEnabled: boolean = false;

  /**
   * 启动任务执行
   * @param ids 账号ID数组
   */
  public async run(ids: number[]) {
    try {
      const accounts = await db.Account.getAccountsByIds(ids);

      // 清理下状态为 success 的账号
      this.cleanUpSuccessAccounts();

      // 批量更新账号状态为等待中
      await db.Account.updateAccountsInBulk(
        accounts.map((account) => ({
          id: account.id,
          status: AccountStatusEnum.WAITING,
        })),
      );

      // 如果 accounts 存在就关闭下
      for (const account of accounts) {
        const accountInfo = this.accountMap.get(account.id);
        if (accountInfo) {
          accountInfo.browserSession?.closeBrowser();
        }

        const getMaxOrder = Array.from(this.accountMap.values()).reduce((max, accountInfo) => {
          return Math.max(max, accountInfo.order);
        }, 0);

        this.accountMap.set(account.id, {
          account,
          status: AccountStatusEnum.WAITING,
          order: getMaxOrder + 1,
        });
      }

      renderLog(`添加 ${accounts.length} 个账号到任务队列`, 'info');
      this.enable();
    } catch (error) {
      renderLog(`启动任务失败: ${error}`, 'error');
    }
  }

  /**
   * 启用任务管理器
   */
  public enable() {
    if (this.isEnabled) {
      return;
    }

    this.isEnabled = true;
    this.startCheckInterval();
    this.startStatusUpdateInterval();
    renderLog('任务管理器已启用', 'info');
  }

  /**
   * 禁用任务管理器
   * isCompalateCleanUp ： 是否完全清理，如果为 true 则清理所有账号，包括正在运行和等待中的账号
   */
  public disable(isCompalateCleanUp: boolean = false) {
    this.isEnabled = false;
    this.stopIntervals();
    this.cleanUp(isCompalateCleanUp);
    renderLog('任务管理器已禁用', 'info');
  }

  private async cleanUpSuccessAccounts() {
    const successAccountIds = Array.from(this.accountMap.values())
      .filter((account) => account.status === AccountStatusEnum.SUCCESS)
      .map((account) => account.account.id);

    for (const id of successAccountIds) {
      this.accountMap.delete(id);
    }
  }

  /**
   * 清理所有正在运行和等待的任务
   * isCompalateCleanUp ： 是否完全清理，如果为 true 则清理所有账号，包括正在运行和等待中的账号
   */
  public async cleanUp(isCompalateCleanUp: boolean = false) {
    try {
      const accountsInfo = Array.from(this.accountMap.values());

      for (const accountInfo of accountsInfo) {
        if (accountInfo.status === AccountStatusEnum.RUNNING) {
          accountInfo.browserSession?.closeBrowser();
          accountInfo.browserSession?.process.kill('SIGKILL');
          accountInfo.browserSession?.process.kill('SIGTERM');
          killChromeBrowserByWindowname(btoa(accountInfo.account.email).replace(/=/g, ''));
          this.accountMap.delete(accountInfo.account.id);
          db.Account.updateAccount(accountInfo.account.id, {
            status: AccountStatusEnum.ERROR,
            logs: '运行中账号被清理',
          });
        } else if (accountInfo.status === AccountStatusEnum.WAITING) {
          this.accountMap.delete(accountInfo.account.id);
        } else if (accountInfo.status === AccountStatusEnum.ERROR) {
          this.accountMap.delete(accountInfo.account.id);
        } else if (accountInfo.status === AccountStatusEnum.SUCCESS) {
          this.accountMap.delete(accountInfo.account.id);
        }

        if (isCompalateCleanUp) {
          console.log('关闭浏览器')
          killChromeBrowserByWindowname(btoa(accountInfo.account.email).replace(/=/g, ''));
          accountInfo.browserSession?.closeBrowser();
          accountInfo.browserSession?.process.kill('SIGTERM');
        }
      }
    } catch (error) {
      renderLog(`清理任务时出错: ${error}`, 'error');
    }
  }

  /**
   * 启动检查间隔
   */
  private startCheckInterval() {
    if (!this.checkInterval) {
      this.checkInterval = setInterval(() => {
        this.checkAndRunNextTask();
      }, 1500);
    }
  }

  /**
   * 启动状态更新间隔
   */
  private startStatusUpdateInterval() {
    if (!this.statusUpdateInterval) {
      this.statusUpdateInterval = setInterval(() => {
        this.updateAccountStatuses();
      }, 1000);
    }
  }

  /**
   * 停止所有间隔
   */
  private stopIntervals() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
      this.statusUpdateInterval = null;
    }
  }

  /**
   * 检查并运行下一个任务
   */
  private async checkAndRunNextTask() {
    try {
      // 检查是否启用
      if (!this.isEnabled) {
        return;
      }

      // 检查全局运行标志
      const settings = await db.Settings.getSettings();
      if (!settings.runFlag) {
        return;
      }

      const accountsInfo = Array.from(this.accountMap.values());
      const waitingAccountsInfo = accountsInfo
        .filter((account) => account.status === AccountStatusEnum.WAITING)
        .sort((a, b) => a.order - b.order);

      const runningAccountsInfo = accountsInfo.filter(
        (account) => account.status === AccountStatusEnum.RUNNING,
      );
      // 检查是否已达到最大并发数
      if (runningAccountsInfo.length >= 2) {
        return;
      }

      // 检查是否有等待的账号
      if (waitingAccountsInfo.length === 0) {
        return;
      }

      // 获取下一个要执行的账号
      const accountInfo = waitingAccountsInfo[0];
      if (!accountInfo) {
        return;
      }

      // 开始执行任务
      this.startTask(accountInfo.account);
    } catch (error) {
      renderLog(`检查任务时出错: ${error}`, 'error');
    }
  }

  /**
   * 开始执行单个任务
   */
  private startTask(account: Account) {
    renderLog(`开始执行账号任务: ${account.email}`, 'info');

    this.executeTask(account);
  }

  /**
   * 执行单个任务
   */
  private async executeTask(account: Account): Promise<void> {
    const accountInfo = this.accountMap.get(account.id);
    if (!accountInfo) {
      return;
    }

    // 更新状态为运行中
    this.accountMap.set(account.id, {
      ...accountInfo,
      status: AccountStatusEnum.RUNNING,
    });

    let closeBrowserFn = () => {};

    try {
      const browserSession = await loginWithGoogle(account, {
        onWaitingForActions: () => {
          const accountInfo = this.accountMap.get(account.id);
          if (!accountInfo) {
            return;
          }
          this.accountMap.set(account.id, {
            ...accountInfo,
            status: AccountStatusEnum.WAITING_FOR_ACTION,
          });
          db.Account.updateAccount(account.id, {
            status: AccountStatusEnum.WAITING_FOR_ACTION,
          });
        },
        onSuccess: () => {
          const accountInfo = this.accountMap.get(account.id);
          if (!accountInfo) {
            return;
          }
          this.accountMap.set(account.id, {
            ...accountInfo,
            status: AccountStatusEnum.SUCCESS,
          });
          db.Account.updateAccount(account.id, {
            status: AccountStatusEnum.SUCCESS,
            lastLoginTimestamp: Date.now(),
          });
        },
        onError: (error) => {
          const accountInfo = this.accountMap.get(account.id);
          if (!accountInfo) {
            return;
          }
          this.accountMap.set(account.id, {
            ...accountInfo,
            status: AccountStatusEnum.ERROR,
          });
          db.Account.updateAccount(account.id, {
            status: AccountStatusEnum.ERROR,
            logs: error instanceof Error ? error.message : String(error),
          });
        },
      });

      closeBrowserFn = browserSession.closeBrowser;

      // 更新下账号
      const accountInfo = this.accountMap.get(account.id);
      if (accountInfo) {
        this.accountMap.set(account.id, {
          ...accountInfo,
          browserSession,
        });
      }
    } catch (error) {
      renderLog(`账号 ${account.email} 执行失败: ${error}`, 'error');

      // 关闭浏览器
      try {
        closeBrowserFn();
      } catch (error) {}

      // 更新数据库状态
      try {
        const accountInfo = this.accountMap.get(account.id);
        if (accountInfo) {
          this.accountMap.set(account.id, {
            ...accountInfo,
            status: AccountStatusEnum.ERROR,
          });
          await db.Account.updateAccount(account.id, {
            status: AccountStatusEnum.ERROR,
            logs: error instanceof Error ? error.message : String(error),
          });
        }
      } catch (dbError) {
        renderLog(`更新账号错误状态失败: ${dbError}`, 'error');
      }
    }
  }

  /**
   * 批量更新账号状态到数据库
   */
  private async updateAccountStatuses() {
    try {
      if (!this.isEnabled || this.accountMap.size === 0) {
        return;
      }

      const needUpdateInfo: {
        id: number;
        status: AccountStatusEnum;
      }[] = [];

      // 收集需要更新的状态
      this.accountMap.forEach((accountInfo) => {
        needUpdateInfo.push({
          id: accountInfo.account.id,
          status: accountInfo.status,
        });
      });

      if (needUpdateInfo.length > 0) {
        if (isEqual(needUpdateInfo, oldUpdate)) {
          return;
        }
        oldUpdate = needUpdateInfo;
        await db.Account.updateAccountsInBulk(needUpdateInfo);
      }
    } catch (error) {
      renderLog(`更新账号状态时出错: ${error}`, 'error');
    }
  }

  public bringBrowserToFrontByAccountId(id: number) {
    const accountInfo = this.accountMap.get(id);
    if (accountInfo) {
      try {
        accountInfo.browserSession?.page && bringToFront(accountInfo.browserSession?.page, accountInfo.account.email);
      } catch (error) {
        renderLog(`账号 ${accountInfo.account.email} 浏览器窗口无法聚焦，可能窗口已关闭`, 'error');
      }
    }
  }
}

const taskManager = new TaskManager();

function cleanupProcesses() {
  taskManager.disable(true);
}

// 注册进程事件处理器
process.on('SIGINT', async () => {
  await cleanupProcesses();
});

process.on('SIGTERM', async () => {
  await cleanupProcesses();
});

process.on('exit', async () => {
  await cleanupProcesses();
});

// 处理未捕获的异常
process.on('uncaughtException', async (err) => {
  await cleanupProcesses();
});

export { taskManager };
