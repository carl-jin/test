import { useEffect } from 'react';
import { IPC } from '@renderer/IPC';

export function useBackgroundMessage() {
  useEffect(() => {
    const remove = IPC.on('showMessage', (type, msg) => {
      //  @ts-ignore
      window.antdApp.message[type]({
        content: msg,
        key: 921,
      });
    });

    return () => remove();
  }, []);
}
