import { OperatorsType } from '@mainTypes';
import { IPC } from '@renderer/IPC';
import { useAppProps } from 'antd/es/app/context';

export declare global {
  interface Window {
    db: OperatorsType;
    antdApp: useAppProps;
    IPC: typeof IPC;
  }
  interface Promise<T> {
    cancel: Function;
  }
}
