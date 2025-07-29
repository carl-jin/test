import { MessageType, UniqueId, MessageObj, LoggerType } from "./types";
import { MessagePort } from "worker_threads";

interface ExtendType<
  ParentMessage extends MessageObj<ParentMessage>,
  WorkerMessage extends MessageObj<WorkerMessage>
> extends LoggerType {
  send<T extends keyof WorkerMessage>(
    name: T,
    ...payload: Parameters<WorkerMessage[T]>
  ): Promise<Awaited<ReturnType<WorkerMessage[T]>>>;
  handle<T extends keyof ParentMessage>(
    name: T,
    fn: (...args: Parameters<ParentMessage[T]>) => ReturnType<ParentMessage[T]>
  ): void;
}

export function TypeSafeWorkerMessagesInWorker<
  ParentMessage extends MessageObj<ParentMessage>,
  WorkerMessage extends MessageObj<WorkerMessage>
>(
  parentPort: MessagePort
): MessagePort & ExtendType<ParentMessage, WorkerMessage> {
  const isMainThread = !parentPort;
  //  @ts-ignore
  const parent: MessagePort & ExtendType<ParentMessage, WorkerMessage> =
    isMainThread
      ? {
          async postMessage(...args) {
            console.log("postMessage", args);
            return Promise.resolve(undefined);
          },
          on(...args) {
            console.log("on", args);
          },
        }
      : parentPort;
  const listeners: Partial<Record<keyof ParentMessage, any>> = {};
  let callbackIncreaseId: number = 0;
  const callbackWaitingMap: Record<number, Function> = {};

  function send<T extends keyof WorkerMessage>(
    name: T,
    ...payload: Parameters<WorkerMessage[T]>
  ): Promise<Awaited<ReturnType<WorkerMessage[T]>>> {
    const callbackID = callbackIncreaseId;

    parent.postMessage({
      from: UniqueId,
      type: "message",
      name,
      payload,
      cbId: callbackID,
    });

    callbackIncreaseId++;

    //  @ts-ignore
    return isMainThread
      ? Promise.resolve(void 0)
      : new Promise((res) => {
          callbackWaitingMap[callbackID] = res;
        });
  }

  function handle<T extends keyof ParentMessage>(
    name: T,
    fn: (...args: Parameters<ParentMessage[T]>) => ReturnType<ParentMessage[T]>
  ): void {
    if (listeners[name])
      throw new Error(`Message handler ${String(name)} already existed!`);
    listeners[name] = fn;
  }

  parent.on("message", async (payload: MessageType) => {
    if (!payload || !payload.from || payload.from !== UniqueId) return;

    //  handle message
    if (payload.type === "message") {
      if (listeners[payload.name]) {
        const res = await listeners[payload.name](...payload.payload);
        //  callback
        parent.postMessage({
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
      if (callbackWaitingMap && callbackWaitingMap[payload.cbId]) {
        callbackWaitingMap[payload.cbId](payload.payload);
        delete callbackWaitingMap[payload.cbId];
      }
    }
  });

  function logger(level) {
    return function (...args) {
      parent.postMessage({
        from: UniqueId,
        type: "logger",
        name: level,
        payload: args,
      });
    };
  }

  parent.send = send;
  parent.handle = handle;

  parent.error = logger("error");
  parent.warn = logger("warn");
  parent.info = logger("info");
  parent.log = logger("log");
  return parent;
}
