import { OperatorsType, DBArgs, DBReturn } from '@mainTypes';
import useSWR from 'swr';

export function useDBSWR<
  Entity extends keyof OperatorsType,
  Method extends keyof OperatorsType[Entity],
>(resource: [string, ...DBArgs<Entity, Method>], ...args) {
  //  默认让每次 mutate 调用时强制更新数据
  const defaultArgs = [undefined, { revalidate: true }];

  return useSWR<DBReturn<Entity, Method>, undefined, [string, ...DBArgs<Entity, Method>]>(
    resource,
    //  @ts-ignore
    ...(args.length === 0 ? defaultArgs : args),
  );
}
