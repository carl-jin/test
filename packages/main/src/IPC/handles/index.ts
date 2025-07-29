import { IPCMain } from '@main/IPC/IPCMain';
import { MainMessage, RenderMessage } from '@main/IPC/messageType';
import { SystemHandler } from './SystemHandler';

export function InitIPCHandler(IPC: IPCMain<RenderMessage, MainMessage>) {
  SystemHandler(IPC);
}
