import { IPCMain } from './IPCMain';
import { MainMessage, RenderMessage } from '@main/IPC/messageType';

const IPC = new IPCMain<RenderMessage, MainMessage>();

export { IPC };
