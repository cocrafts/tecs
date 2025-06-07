import type { Query, QueryPairs } from './query';
import type { Event, StateMap } from './state-machine';
import type { DeepReadonly, Simplify } from './util-types';

export const ECSStateMap = {
  initial: {
    on: { start: 'wait_action' },
  },
  wait_action: {
    on: { handle: 'on_action' },
  },
  on_action: {
    on: { call: 'command_execution', no_call: 'end' },
  },
  command_execution: {
    on: { mutate: 'change_evaluation' },
  },
  change_evaluation: {
    on: { has_changes: 'normal_system', no_change: 'end' },
  },
  normal_system: {
    on: { call: 'change_evaluation', no_mutation: 'settled_system' },
  },
  settled_system: {
    on: { call: 'command_execution', no_mutation: 'end' },
  },
  end: {
    on: { reset: 'wait_action' },
  },
} as const satisfies StateMap;

export type ECSStateRunner<K extends keyof typeof ECSStateMap> = Event<typeof ECSStateMap, K>

export type Entity<CM> = Partial<CM> & { id: number };

export type System<ECSContent, ComponentMap extends object> = {
  queryPairs: QueryPairs<ComponentMap>;
  update(ecs: ECSContent): void;
};

export type ECSContext<
  ComponentMap extends object,
  Command extends { type: string },
  GlobalState extends object,
  M extends 'mutable' | 'readonly'
> =
  Commands<Command> &Query<ComponentMap, M> & {
    global: M extends 'readonly' ? DeepReadonly<GlobalState> : GlobalState;
  };

export type Commands<Command extends { type: string }> = {
  [K in Command['type']]: (data: Simplify<Omit<Extract<Command, { type: K }>, 'type'>>) => void;
};

export type CommandFn<
  ECSContext,
  Command extends { type: string },
  Key extends Command['type']
> = (ecs: ECSContext, command: Command & { type: Key }) => void;

export type ActionFn<
  ECSContext,
  Action extends { type: string },
  Key extends Action['type']
> = (ecs: ECSContext, action: Action & { type: Key }) => void;

export type CommandMap<ECSContext, Command extends { type: string }> = {
  [K in Command['type']]?: CommandFn<ECSContext, Command, K>;
};

export type ActionMap<ECSContext, Action extends { type: string }> = {
  [K in Action['type']]?: ActionFn<ECSContext, Action, K>;
};

export type SystemMap<ECSContext, ComponentMap extends object> = Record<
  string,
  System<ECSContext, ComponentMap>[]
>;
