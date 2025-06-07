/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Entity } from './interfaces';
import type { DeepReadonly, Simplify } from './util-types';

export type QueryKey = 'not' | 'and' | 'changed' | 'added' | 'removed';

export type QueryPairs<CM extends object> = [QueryKey, keyof CM][];

export const createSystemQuery = <CM extends object>() => {
  type CMKeys = keyof CM;

  const query = <
    UsedKeys extends CMKeys = never,
    ExcludedKeys extends CMKeys = never
  >(
      queryPairs: QueryPairs<CM> = [],
    ) => {
    const q = {
      not: <K extends CMKeys>(key: K) => query<UsedKeys, ExcludedKeys | K>([...queryPairs, ['not', key]]),
      and: <K extends CMKeys>(key: K) => query<UsedKeys | K, ExcludedKeys>([...queryPairs, ['and', key]]),
      changed: <K extends CMKeys>(key: K) => query<UsedKeys | K, ExcludedKeys>([...queryPairs, ['changed', key]]),
      added: <K extends CMKeys>(key: K) => query<UsedKeys | K, ExcludedKeys>([...queryPairs, ['added', key]]),
      removed: <K extends CMKeys>(key: K) => query<UsedKeys, ExcludedKeys | K>([...queryPairs, ['removed', key]]),
      build: () => ({ queryPairs }),
    };

    return q as typeof q & {
      $CM: CM;
      $UsedKeys: UsedKeys;
      $ExcludedKeys: ExcludedKeys;
    };
  };

  return query();
};

export type Query<
  CM extends object,
  M extends 'mutable' | 'readonly'
> = SingleQuery<CM, M> & LoopQuery<CM, M>;

export type SingleQuery<
  CM extends object,
  M extends 'mutable' | 'readonly',
  E = M extends 'readonly' ? DeepReadonly<Partial<CM>> : Partial<CM>
> = {
  id: (id: number) => Simplify<E>;
};

export type LoopQuery<
  CM extends object,
  M extends 'mutable' | 'readonly',
  UsedKeys extends keyof CM = never,
  ExcludedKeys extends keyof CM = never,
  QueriedEntity = Pick<Required<Entity<CM>>, UsedKeys> &
    Omit<Entity<CM>, ExcludedKeys>
> = {
  has: <K extends keyof CM>(
    key: K
  ) => LoopQuery<CM, M, UsedKeys | K, ExcludedKeys>;
  not: <K extends keyof CM>(
    key: K
  ) => LoopQuery<CM, M, UsedKeys, ExcludedKeys | K>;
  query: () => M extends 'readonly'
    ? Simplify<DeepReadonly<QueriedEntity>>[]
    : Simplify<QueriedEntity>[];
};

export const createQuery = <
  CM extends object,
  M extends 'mutable' | 'readonly',
>(
    entities: Entity<CM>[],
  ): Query<CM, M> => {
  const id = (id: number) => entities[id];

  const query = (entities: Entity<CM>[]) => ({
    has: (key: keyof CM) => query(entities.filter((e) => !!e[key])),
    not: (key: keyof CM) => query(entities.filter((e) => !e[key])),
    query: () => entities,
  });

  return { ...query(entities), id } as Query<CM, M>;
};
