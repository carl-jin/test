import { OperatorsType, DatabaseMessageResponseType } from '@mainTypes';
import { ErrorMessage } from '@renderer/utils/message';
import { dbMessage } from '#preload';
import PCancelable from 'p-cancelable';

export async function injectDBClient(): Promise<void> {
  const structure: OperatorsType = await dbMessage('database_operate_structure_message');

  //  @ts-ignore
  window.db = {};

  Object.entries(structure).forEach(([key, value]) => {
    //  @ts-ignore
    window.db[key] = window.db[key] || {};
    //  @ts-ignore
    Object.keys(value).forEach((methodName) => {
      //  @ts-ignore
      window.db[key][methodName] = function (...args) {
        return new PCancelable(async (resolve, reject, onCancel) => {
          let canceled = false;

          try {
            onCancel.shouldReject = false;
            onCancel(() => {
              canceled = true;
            });
            const res: DatabaseMessageResponseType<unknown> = await dbMessage(
              'database_operate_message',
              `${key}.${methodName}`,
              ...args,
            );

            if (canceled) {
              return;
            }

            if (res.type === 'success') {
              return resolve(res.result);
            }

            if (res.type === 'error') {
              throw new Error(res.error);
            }

            throw new Error('未知的数据类型');
          } catch (e: any) {
            console.error(e);
            ErrorMessage(e.toString());

            return reject(e);
          }
        });
      };
    });
  });
}
