export * from './types/index';
import type { OperatorsType } from './operators/index';

type DatabaseMessageResponseType<T extends unknown> = {
  type: 'success' | 'error';
  error: undefined | string;
  result: T;
  duration: string;
  operator: string;
  args: unknown[];
};

type DBReturn<
  Entity extends keyof OperatorsType,
  Method extends keyof OperatorsType[Entity],
> = OperatorsType[Entity][Method] extends (...args: any[]) => Promise<infer R> ? R : never;

type DBArgs<
  Entity extends keyof OperatorsType,
  Method extends keyof OperatorsType[Entity],
> = OperatorsType[Entity][Method] extends (...args: infer Args) => any ? Args : never;

export type { OperatorsType, DBReturn, DBArgs, DatabaseMessageResponseType };
