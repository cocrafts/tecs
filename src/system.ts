/* eslint-disable @typescript-eslint/no-explicit-any */
import type { DeepReadonly } from './util-types';

export type QueryLike = {
  $CM: any;
  $UsedKeys: any;
  $ExcludedKeys: any;
  build: () => any;
};

type QueriedEntity<T extends QueryLike> = Omit<
  Pick<T['$CM'], T['$UsedKeys']> & Partial<Omit<T['$CM'], T['$UsedKeys']>>,
  T['$ExcludedKeys']
>;

export const createSystem = <T extends QueryLike, E extends QueriedEntity<T>>(
  query: T,
  update: (ecs: any, entity: DeepReadonly<E>) => void,
) => ({ queryPairs: query.build(), update });
