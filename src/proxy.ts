import TECSError from './error';

export type ProxyMutation = 'add' | 'remove' | 'change';

export type ProxyPath = (string | symbol)[];

export type ProxyNotify = (mutation: ProxyMutation, path: ProxyPath) => void;

export type ProxyController = {
  isMutable: () => boolean;
  notify: ProxyNotify;
};

export const proxify = <T extends object>(
  obj: T,
  ctr: ProxyController,
  path: ProxyPath = [],
): T => {
  const objWithProxifiedFields = Object.entries(obj).reduce(
    (acc, [prop, value]) => ({
      ...acc,
      [prop]:
          typeof value === 'object'
            ? proxify(value, ctr, [...path, prop])
            : value,
    }),
    {},
  );

  return new Proxy(objWithProxifiedFields, {
    set(target, prop, value) {
      if (!ctr.isMutable()) throw TECSError.accessImmutableData();

      if (!(prop in target)) {
        ctr.notify('add', [...path, prop]);
      } else if (target[prop as never] !== value) {
        ctr.notify('change', [...path, prop]);
      }

      if (typeof value === 'object') {
        const cloned = structuredClone(value);
        target[prop] = proxify(cloned, ctr, [...path, prop]);
      } else {
        target[prop] = value;
      }

      return true;
    },
    deleteProperty(target, prop) {
      if (!target[prop]) return false;
      ctr.notify('remove', [...path, prop]);
      delete target[prop];
      return true;
    },
  }) as T;
};
