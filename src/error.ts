export default class TECSError extends Error {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private constructor(...arg: any[]) {
    super(...arg);
  }

  static invalidTransition(...stateOrAction: unknown[]) {
    return new TECSError(`[StateMachine] Invalid transition: ${stateOrAction.map((s) => `'${s}'`).join(' -> ')}`);
  }

  static stateRunnerIsRegistered(state: unknown) {
    return new TECSError(`[StateMachine] State '${state}' is already registered with a runner`);
  }

  static initialStateNotExist(state:unknown) {
    return new TECSError(`[StateMachine] Initial '${state}' is not available in state map`);
  }

  static accessImmutableData() {
    return new TECSError('Data is immutable in this context, it is mutable only in commands');
  }

  static notInitialToStart() {
    return new TECSError('Can not call \'start\' when the current state is not \'initial\'');
  }

  static notWaitForActionToPushAction() {
    return new TECSError('Can not push new action when the current state is not \'wait_action\'');
  }

  static notAllowAsyncCommand() {
    return new TECSError('Async commands is not allowed, use synchronous commands to maintain mutability');
  }

  static requireInState(state: unknown, thing: unknown) {
    return new TECSError(`Require ${thing} to handle '${state}'`);
  }

  static requireHandlerForAction(action: unknown) {
    return new TECSError(`Require handler to handle '${action}'`);
  }

  static requireCommandExecutor(command: unknown) {
    return new TECSError(`Require command executor for '${command}'`);
  }
}
