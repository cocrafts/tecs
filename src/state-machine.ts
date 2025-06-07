/* eslint-disable @typescript-eslint/no-explicit-any */
import type { KeysOfUnion } from './util-types';
import TECSError from './error';

export type StateMap<S extends string = string, A extends string = string> = {
  [$State in S]: { on: { [$Action in A]: S } };
};

export type State<T extends StateMap> = keyof T;

export type Event<
  T extends StateMap,
  K extends keyof T = keyof T
> = KeysOfUnion<T[K]['on']>;

export type StateRunnerMap<T extends StateMap> = {
  [K in keyof T]: () => Event<T, K> | null;
};

export class StateMachine<T extends StateMap> {
  private initialState: keyof T;

  private currentState: keyof T;

  private stateMap: T;

  private runnerMap: StateRunnerMap<T> = {} as StateRunnerMap<T>;

  constructor(stateMap: T, initialState: keyof T) {
    this.initialState = initialState;
    this.currentState = initialState;
    this.stateMap = stateMap;
    this.validateStateMachine();
  }

  get current() {
    return this.currentState;
  }

  get availableActions() {
    return this.getActionsOf(this.currentState);
  }

  get states() {
    return Object.keys(this.stateMap);
  }

  public validateAction(action: Event<T, any>): boolean {
    return this.validateActionOf(this.currentState, action);
  }

  public validateActionOf(state: keyof T, action: Event<T, any>): boolean {
    const nextState = this.stateMap[state]?.on[action];
    return !!nextState;
  }

  public getActionsOf(state: keyof T) {
    return Object.keys(this.stateMap[state].on);
  }

  public isEndState(state: keyof T): boolean {
    return Object.keys(this.stateMap[state].on).length === 0;
  }

  public transition<S extends keyof T>(action: Event<T, S>) {
    const nextState = this.stateMap[this.currentState]?.on[action];
    if (!nextState) { throw TECSError.invalidTransition(this.currentState, action); }

    this.currentState = nextState;

    const runner = this.runnerMap[nextState];
    if (runner) {
      const nextAction = runner();
      if (nextAction) this.transition(nextAction);
    }
  }

  public reset() {
    this.currentState = this.initialState;
  }

  public registerRunner = <S extends keyof T>(
    state: S,
    runner: () => Event<T, S> | null,
  ) => {
    if (this.runnerMap[state]) throw TECSError.stateRunnerIsRegistered(state);

    this.runnerMap[state] = runner;
  };

  private validateStateMachine(): void {
    if (!this.stateMap[this.initialState]) throw TECSError.initialStateNotExist(this.initialState);

    Object.entries(this.stateMap).forEach(([state, config]) => {
      Object.entries(config.on).forEach(([action, nextState]) => {
        if (!this.stateMap[nextState]) throw TECSError.invalidTransition(state, action, nextState);
      });
    });
  }
}
