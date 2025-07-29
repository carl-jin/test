import { MessageType, UniqueId, MessageObj, LoggerType } from "./types";
import { Worker, WorkerOptions } from "worker_threads";

export class TypeSafeWorkerMessagesInMain<
  ParentMessage extends MessageObj<ParentMessage>,
  WorkerMessage extends MessageObj<WorkerMessage>
> extends Worker {
  //  @ts-ignore
  listeners: Partial<Record<keyof WorkerMessage, any>> = {};
  //  @ts-ignore
  callbackIncreaseId: number = 0;
  //  @ts-ignore
  callbackWaitingMap: Record<number, Function> = {};
  logger: LoggerType;

  constructor(
    filename: string | URL,
    options?: WorkerOptions,
    logger?: LoggerType
  ) {
    super(filename, options);
    this.logger = logger ?? console;
    this._bindMessage();
  }

  send<T extends keyof ParentMessage>(
    name: T,
    ...payload: Parameters<ParentMessage[T]>
  ): Promise<Awaited<ReturnType<ParentMessage[T]>>> {
    const callbackID = this.callbackIncreaseId;
    this.postMessage({
      from: UniqueId,
      type: "message",
      name,
      payload,
      cbId: callbackID,
    });

    this.callbackIncreaseId++;

    return new Promise((res) => {
      this.callbackWaitingMap[callbackID] = res;
    });
  }

  handle<T extends keyof WorkerMessage>(
    name: T,
    fn: (...args: Parameters<WorkerMessage[T]>) => ReturnType<WorkerMessage[T]>
  ): void {
    if (this.listeners[name])
      throw new Error(`Message handler ${String(name)} already existed!`);
    this.listeners[name] = fn;
  }

  _bindMessage() {
    this.on("message", this._handleReceivingMessage.bind(this));
  }

  async _handleReceivingMessage(payload: MessageType) {
    if (!payload || !payload.from || payload.from !== UniqueId) return;

    //  handle message
    if (payload.type === "message") {
      if (this.listeners[payload.name]) {
        const res = await this.listeners[payload.name](...payload.payload);
        //  callback
        this.postMessage({
          from: UniqueId,
          type: "callback",
          name: "",
          payload: res,
          cbId: payload.cbId,
        });
      } else {
       // do nothing
      }
      return;
    }

    //  handle callback
    if (payload.type === "callback") {
      if (this.callbackWaitingMap && this.callbackWaitingMap[payload.cbId]) {
        this.callbackWaitingMap[payload.cbId](payload.payload);
        delete this.callbackWaitingMap[payload.cbId];
      }
    }

    //  logger
    if (payload.type === "logger") {
      this.logger[payload.name](...payload.payload);
    }
  }
}
