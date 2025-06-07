export default class TECSError extends Error {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private constructor(...arg: any[]) {
    super(...arg);
  }

  static invalidTransition(...stateOrAction: unknown[]) {
    return new TECSError(`[StateMachine] Invalid transition: ${stateOrAction.map((s) => `'${s}'`).join(' -> ')}`);
  }

  static stateRunnerIsRegistered(state: unknown) {
    throw new TECSError(`[StateMachine] State '${state}' is already registered with a runner`);
  }

  static initialStateNotExist(state:unknown) {
    throw new TECSError(`[StateMachine] Initial '${state}' is not available in state map`);
  }

  static accessImmutableData() {
    throw new TECSError('Data is immutable in this context, it is only mutable in commands');
  }

  static notInitialToStart() {
    throw new TECSError('Can not call \'start\' when the current state is not \'initial\'');
  }

  static notWaitForActionToPushAction() {
    throw new TECSError('Can not push new action when the current state is not \'wait_action\'');
  }

  static notAllowAsyncCommand() {
    throw new TECSError('Async commands is not allowed, use synchronous commands to maintain mutability');
  }

  static requireInState(state: unknown, thing: unknown) {
    throw new TECSError(`Require ${thing} to handle '${state}'`);
  }

  static requireHandlerForAction(action: unknown) {
    throw new TECSError(`Require handler to handle '${action}'`);
  }

  static requireCommandExecutor(command: unknown) {
    throw new TECSError(`Require command executor for '${command}'`);
  }
}
