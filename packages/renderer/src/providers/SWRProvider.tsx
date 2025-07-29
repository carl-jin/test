import { ErrorMessage } from '@renderer/utils/message';
import { ReactNode } from 'react';
import { get } from 'lodash';
import { SWRConfig } from 'swr';

export function SWRProvider(props: { children: ReactNode }) {
  async function fetcher(resource: unknown[]) {
    try {
      const path = resource[0] as string;
      const args = resource.slice(1);

      const method = get(window.db, path, false) as any;
      if (method) {
        return await method(...args);
      } else {
        return Promise.reject(new Error(`未知的方法调用 ${path}`));
      }
    } catch (e) {
      return Promise.reject(e);
    }
  }

  return (
    <SWRConfig
      value={{
        fetcher,
        shouldRetryOnError: false,
        onError: (error) => {
          console.error(error);
          ErrorMessage(error.toString());
        },
      }}
    >
      {props.children}
    </SWRConfig>
  );
}
