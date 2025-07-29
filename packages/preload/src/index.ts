/**
 * @module preload
 */
import { ipcRenderer } from 'electron';

export { versions } from './versions';

// @ts-ignore
async function dbMessage(messageName: string, ...args) {
  return await ipcRenderer.invoke(messageName, ...args);
}

function on(...args: any) {
  //  @ts-ignore
  return ipcRenderer.on(...args);
}

function invoke(...args: any) {
  //@ts-ignore
  return ipcRenderer.invoke(...args);
}

export { invoke, on, dbMessage };
