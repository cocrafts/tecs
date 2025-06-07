export default class TECSError extends Error {
  static invalidTransition(...stateOrAction: unknown[]) {
    return new TECSError(`[StateMachine] Invalid transition: ${stateOrAction.map((s) => `'${s}'`).join(' -> ')}`);
  }

  static stateRunnerIsRegistered(state: unknown) {
    throw new TECSError(`[StateMachine] State '${state}' is already registered with a runner`);
  }

  static initialStateNotExist(state:unknown) {
    throw new TECSError(`[StateMachine] Initial '${state}' is not available in state map`);
  }
}
