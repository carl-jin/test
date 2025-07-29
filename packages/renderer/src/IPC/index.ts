import { IPCRenderer } from './IPCRenderer';
import { MainMessage, RenderMessage } from '@mainTypes';

const IPC = new IPCRenderer<RenderMessage, MainMessage>();
window.IPC = IPC;

export { IPC };
