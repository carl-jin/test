import { useEffect } from 'react';
import { IPC } from '@renderer/IPC';

export function useOpenLinkHooks() {
  useEffect(() => {
    document.body.addEventListener('click', handleClick);

    return () => {
      document.body.removeEventListener('click', handleClick);
    };
  });

  function handleClick(event) {
    if (event.target.tagName === 'A' && event.target.href.startsWith('http')) {
      event.preventDefault();

      IPC.send('openLink', event.target.href);
    }
  }
}
