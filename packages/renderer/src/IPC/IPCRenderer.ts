import { ErrorMessage } from '@renderer/utils/message';
import { invoke, on } from '#preload';

type MessageObj<T> = {
  [K in keyof T]: (...args: any) => void;
};

export class IPCRenderer<
  MessageType extends MessageObj<MessageType>,
  BackgroundMessageType extends MessageObj<BackgroundMessageType>,
> {
  channel: string;
  listeners: Partial<Record<keyof BackgroundMessageType, any>> = {};

  constructor(channel: string = 'IPC-bridge') {
    this.channel = channel;

    this._bindMessage();
  }

  send<T extends keyof MessageType>(
    name: T,
    ...payload: Parameters<MessageType[T]>
  ): Promise<Awaited<ReturnType<MessageType[T]>>> {
    return new Promise(async (res, rej) => {
      const data = await invoke(this.channel, {
        name: String(name),
        payload,
      });
      if (data.type === 'success') {
        return res(data.result);
      } else {
        ErrorMessage(data.error);
        return rej(data.error);
      }
    });
  }

  sendWithoutErrorPopup<T extends keyof MessageType>(
    name: T,
    ...payload: Parameters<MessageType[T]>
  ): Promise<Awaited<ReturnType<MessageType[T]>>> {
    return new Promise(async (res, rej) => {
      const data = await invoke(this.channel, {
        name: String(name),
        payload,
      });
      if (data.type === 'success') {
        return res(data.result);
      } else {
        return rej(data.error);
      }
    });
  }

  on<T extends keyof BackgroundMessageType>(
    name: T,
    fn: (...args: Parameters<BackgroundMessageType[T]>) => void,
  ): () => void {
    this.listeners[name] = this.listeners[name] || [];

    this.listeners[name].push(fn);

    return () => {
      if (this.listeners[name].includes(fn)) {
        const index = this.listeners[name].indexOf(fn);
        this.listeners[name].splice(index, 1);
      }
    };
  }

  _handleReceivingMessage(_, payloadData: { name: keyof BackgroundMessageType; payload: any }) {
    const { name, payload } = payloadData;

    if (this.listeners[name]) {
      for (let fn of this.listeners[String(name)]) {
        fn(...payload);
      }
    }
  }

  _bindMessage() {
    on(this.channel, this._handleReceivingMessage.bind(this));
  }
}
