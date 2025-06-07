import { test, beforeEach, expect } from 'bun:test';
import ECS from './ecs';
import TECSError from './error';

let ecs: ECS<ComponentMap, Action, Command, GlobalState>;

beforeEach(() => {
  ecs = new ECS<ComponentMap, Action, Command, GlobalState>({
    phase: 'Initial',
    turnOf: 'alice',
  });
});

test('should mutate globalState by command called from action', () => {
  ecs.createEntity({ playerId: 'alice' });
  ecs.createEntity({ playerId: 'bob' });

  ecs.addCommand('changeTurn', (ecs, { turnOf }) => {
    ecs.global.turnOf = turnOf;
  });

  ecs.addAction('EndTurn', (ecs) => {
    const [p1, p2] = ecs.has('playerId');
    const next = p1.playerId === ecs.global.turnOf ? p2.playerId : p1.playerId;
    ecs.changeTurn({ turnOf: next });
  });

  ecs.start();

  ecs.pushAction({ type: 'EndTurn' });
});

test('should throw error if trying to mutate context in action handler', () => {
  ecs.createEntity({ playerId: 'alice' });
  ecs.createEntity({ playerId: 'bob' });

  ecs.addAction('EndTurn', (ecs) => {
    const [p1, p2] = ecs.has('playerId');
    const next = p1.playerId === ecs.global.turnOf ? p2.playerId : p1.playerId;
    // @ts-expect-error readonly context
    ecs.global.turnOf = next;
  });

  ecs.start();

  expect(() => ecs.pushAction({ type: 'EndTurn' })).toThrow(TECSError.accessImmutableData());
});

test('should throw error if calling start multiple times', () => {
  ecs.start();
  expect(() => ecs.start()).toThrow(TECSError.notInitialToStart());
});

test('should create entity with components', () => {
  ecs.createEntity({ health: 100, attack: 10 });
  const entities = ecs.query.has('health');
  expect(entities[0].health).toBe(100);
  expect(entities[0].attack).toBe(10);
});

test('should execute multiple commands in sequence', () => {
  ecs.createEntity({ health: 100, attack: 10 });
  ecs.createEntity({ health: 100, attack: 20 });

  ecs.addCommand('dealDamage', (ecs, { targetId, damage }) => {
    const target = ecs.id(targetId);
    if (target.health !== undefined) target.health -= damage;
  });

  ecs.addAction('Combat', (ecs) => {
    const [c1, c2] = ecs.has('health').has('attack');
    ecs.dealDamage({ targetId: c1.id, sourceId: c2.id, damage: c2.attack });
    ecs.dealDamage({ targetId: c2.id, sourceId: c1.id, damage: c1.attack });
  });

  ecs.start();
  ecs.pushAction({ type: 'Combat' });

  const [c1, c2] = ecs.query.has('health');
  expect(c1.health).toBe(80);
  expect(c2.health).toBe(90);
});

type ComponentMap = {
  health: number;
  attack: number;
  place: {
    place: 'Ground' | 'Hand' | 'Deck';
    index: number;
  };
  owner: number;
  death: number;
  revealed: number;
  playerId: string;
};

type Action =
  | {
      type: 'SummonCard';
      cardId: number;
    }
  | {
      type: 'EndTurn';
    }
  | {
      type: 'Combat';
    }

type Command =
  | {
      type: 'moveCard';
      from: number;
      to: number;
    }
  | {
      type: 'dealDamage';
      sourceId: number;
      targetId: number;
      damage: number
    }
  | {
      type: 'healCard';
      health: number;
    }
  | {
      type: 'healPlayer';
      health: number;
    }
  | {
      type: 'changeTurn';
      turnOf: string;
    };

type Phase = 'Initial' | 'Draw' | 'Setup' | 'PreFight' | 'Fight' | 'PostFight';

type GlobalState = {
  phase: Phase;
  turnOf: string;
};
