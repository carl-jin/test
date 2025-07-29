import { operators as operatorsMap, OperatorsType } from '@main/db/operators';
import { writeError } from '@main/utils/errors';
import { formatDurationToS } from '@main/utils/utils';
import { Account } from './entity/Account.entity';
import { Settings } from './entity/Settings.entity';
import { ipcMain } from 'electron';
import { get } from 'lodash';
import sqlite3 from 'sqlite3';
import { DataSource } from 'typeorm';

export const DATABASE_OPERATE_MESSAGE_NAME = 'database_operate_message';
export const GET_DATABASE_OPERATE_STRUCTURE_NAME = 'database_operate_structure_message';

//  @ts-ignore
let db: DBServerInstance['operators'] = {};

class DBServerInstance {
  AppDataSource: DataSource;
  //  @ts-ignore
  operators: OperatorsType = {};

  init(path: string): Promise<void> {
    this.AppDataSource = new DataSource({
      type: 'sqlite',
      database: path,
      entities: [Account, Settings],
      synchronize: true,
      logging: ['error', 'warn'],
      driver: sqlite3,
      // logging:true,
    });

    return new Promise((res, rej) => {
      this.AppDataSource.initialize()
        .then(async () => {
          this.initOperators();
          this.bindMessage();
          db = this.operators;

          this.DBInit().then(() => {
            res();
          });
        })
        .catch((error) => rej(error));
    });
  }

  //  启动时创建一些东西
  private async DBInit() {
  }

  public close() {
    this.AppDataSource.destroy().then();
  }

  private initOperators() {
    for (const entityName in operatorsMap) {
      const key = entityName as keyof typeof operatorsMap;
      this.operators[key] = new operatorsMap[key](this.AppDataSource) as any;
    }
  }

  private bindMessage() {
    //  path 是 operators 路径
    //  比如 "Account.getAccountById",
    //  args 是 Account.getAccountById 这个方法接受的参数数组 [userId]
    ipcMain.handle(DATABASE_OPERATE_MESSAGE_NAME, async (_, path, ...args) => {
      const start = Date.now();
      try {
        const [entity, methodName] = path.split('.');
        const operator = get(this.operators, path, false);

        if (!operator) throw new Error(`${path} 不存在！`);
        //  @ts-ignore
        const data = await this.operators[entity][methodName](...args);
        const end = Date.now();
        const timeConsumed = formatDurationToS(Date.now() - start);

        return {
          type: 'success',
          error: undefined,
          result: data,
          duration: timeConsumed,
          operator: path,
          args: args,
        };
      } catch (e: any) {
        const end = Date.now();
        writeError(e, 'runtime');

        return {
          type: 'error',
          // @ts-ignore
          error: e.toString(),
          result: undefined,
          duration: formatDurationToS(end - start),
          operator: path,
          args: args,
        };
      }
    });

    /**
     * 将 operators 的数据类型对象返回给前端
     * 前端根据这个对象进行转换为
     * window.db.Account.getAccountById = function(...args){
     *  invoke("Account.getAccountById", ...args)
     * }
     */
    ipcMain.handle(GET_DATABASE_OPERATE_STRUCTURE_NAME, (async) => {
      const structureObj: any = {};

      for (let entity in this.operators) {
        //  @ts-ignore
        const instance = this.operators[entity] as any;
        const methods: any = {};

        const methodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(instance)).filter(
          (propName) =>
            typeof instance[propName] === 'function' && !['constructor'].includes(propName),
        );

        methodNames.map((method) => {
          methods[method] = true;
        });

        structureObj[entity] = methods;
      }

      return structureObj;
    });
  }
}

const DBServer = new DBServerInstance();

export { DBServer, db, DBServerInstance };
