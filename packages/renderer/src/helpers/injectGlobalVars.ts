import { IPC } from '@renderer/IPC';

export function injectGlobalVars(): Promise<void> {
  return new Promise((res) => {
    IPC.send('getInjectGlobalVars').then((vars) => {
      Object.entries(vars).map(([key, value]) => {
        window[key] = value;
      });

      res();
    });
  });
}
