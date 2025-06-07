/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Event } from './state-machine';
import { StateMachine } from './state-machine';
import type { ProxyNotify } from './proxy';
import { proxify } from './proxy';
import { createQuery } from './query';
import TECSError from './error';
import type {
  ActionFn,
  ActionMap,
  CommandFn,
  CommandMap,
  Commands,
  ECSContext,
  ECSStateRunner,
  Entity,
  System,
  SystemMap,
} from './interfaces';
import { ECSStateMap } from './interfaces';

export default class ECS<
  ComponentMap extends object = object,
  Action extends { type: string } = { type: string },
  Command extends { type: string } = { type: string },
  GlobalState extends object = object,
  MutableContext = ECSContext<ComponentMap, Command, GlobalState, 'mutable'>,
  ReadonlyContext = ECSContext<ComponentMap, Command, GlobalState, 'readonly'>
> {
  private isMutable: boolean = false;

  private globalState: GlobalState;

  private entities: Entity<ComponentMap>[] = [];

  private pendingAction: Action | null = null;

  private pendingCommands: Command[] = [];

  private executedCommands: Command[] = [];

  private stateMachine = new StateMachine(ECSStateMap, 'initial');

  private systemMap: SystemMap<ReadonlyContext, ComponentMap> = {};

  private actionMap: ActionMap<ReadonlyContext, Action> = {};

  private commandMap: CommandMap<MutableContext, Command> = {};

  private commands: Commands<Command> = {} as Commands<Command>;

  public query = createQuery<ComponentMap, 'readonly'>(this.entities);

  constructor(initialState: GlobalState) {
    this.globalState = proxify(structuredClone(initialState), {
      isMutable: () => this.isMutable,
      notify: this.notifyGlobalState,
    });

    const { registerRunner } = this.stateMachine;
    registerRunner('wait_action', this.runWaitAction);
    registerRunner('on_action', this.runOnAction);
    registerRunner('command_execution', this.runCommandExecution);
    registerRunner('change_evaluation', this.runChangeEvaluation);
    registerRunner('normal_system', this.runNormalSystem);
    registerRunner('settled_system', this.runSettledSystem);
    registerRunner('end', this.runEnd);
  }

  /** Commands should only be called inside ECS, use with caution */
  public get unsafeCommands() {
    return this.commands;
  }

  private get readonlyContext(): ReadonlyContext {
    return { global: this.globalState, ...this.query, ...this.commands } as ReadonlyContext;
  }

  private get mutableContext(): MutableContext {
    return { global: this.globalState, ...this.query, ...this.commands } as MutableContext;
  }

  public start() {
    if (this.stateMachine.current !== 'initial') throw TECSError.notInitialToStart();

    this.stateMachine.transition<'initial'>('start');
  }

  public createEntity(data: Partial<ComponentMap>) {
    const entityId = this.entities.length;
    const entity = proxify(structuredClone({ ...data, id: entityId }), {
      isMutable: () => this.isMutable,
      notify: this.entityNotifier(entityId),
    });
    this.entities.push(entity);
  }

  public addAction<T extends Action['type']>(
    type: T,
    handle: ActionFn<ReadonlyContext, Action, T>,
  ) {
    this.actionMap[type] = handle;
  }

  public addCommand<T extends Command['type']>(
    type: T,
    execute: CommandFn<MutableContext, Command, T>,
  ) {
    this.commandMap[type] = execute;
    this.commands[type] = (data: Omit<Command & { type: T; }, 'type'>) => {
      const command = { ...data, type } as Command & {type: T};
      if (this.stateMachine.current === 'command_execution') {
        this.pendingCommands.unshift(command);
      } else {
        this.pendingCommands.push(command);
      }
    };
  }

  /**
   * Run once when the ECS starts running
   */
  public addSetup() {
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public addSystem(system: System<ComponentMap, Command>) {
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public addSettledSystem(system: System<ComponentMap, Command>) {
    return this;
  }

  public pushAction(action: Action) {
    if (this.stateMachine.current !== 'wait_action') throw TECSError.notWaitForActionToPushAction();
    this.pendingAction = action;
    this.stateMachine.transition<'wait_action'>('handle');
  }

  protected runSystem(
    entityId: number,
    handle: (entity: Readonly<Entity<ComponentMap>>) => void,
  ) {
    this.isMutable = false;
    handle(this.entities[entityId]);
    this.isMutable = false;
  }

  private runWaitAction = () => null;

  private runOnAction = (): Event<typeof ECSStateMap, 'on_action'> => {
    const action = this.pendingAction;
    if (!action) throw TECSError.requireInState('on_action', 'pending action');

    const handle = this.actionMap[action.type];
    if (!handle) throw TECSError.requireHandlerForAction(action.type);

    handle(this.readonlyContext, action);

    return 'call';
  };

  private runChangeEvaluation = (): Event<typeof ECSStateMap, 'change_evaluation'> => 'no_change';

  private runCommandExecution = (): ECSStateRunner<'command_execution'> => {
    let command = this.pendingCommands.shift();
    while (command) {
      this.executedCommands.push(command);

      const execute = this.commandMap[command.type];
      if (!execute) throw TECSError.requireCommandExecutor(command.type);

      this.isMutable = true;
      const result: any = execute(this.mutableContext, command);
      this.isMutable = false;

      if (result instanceof Promise) throw TECSError.notAllowAsyncCommand();

      command = this.pendingCommands.shift();
    }

    return 'mutate';
  };

  private runNormalSystem = (): ECSStateRunner<'normal_system'> => 'call';

  private runSettledSystem = (): ECSStateRunner<'settled_system'> => 'call';

  private runEnd = () => null;

  private entityNotifier = (entityId: number) => {
    const notify: ProxyNotify = (mutation, path) => {
      console.debug(`-> Entity(${entityId}) ${mutation} ${path.join('.')}`);
    };
    return notify;
  };

  private notifyGlobalState: ProxyNotify = (mutation, path) => {
    console.debug(`-> GlobalState ${mutation} ${path.join('.')}`);
  };
}
