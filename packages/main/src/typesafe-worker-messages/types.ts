export const UniqueId = "TSWM";
import type { LogFunctions } from "electron-log";

export type MessageObj<T> = {
  [K in keyof T]: (...args: any) => void;
};

export type MessageType = {
  from: typeof UniqueId;
  type: "message" | "callback" | "logger";
  name: string;
  payload: any;
  cbId: string;
};

export type LoggerType = Pick<LogFunctions, "error" | "warn" | "info" | "log">;
