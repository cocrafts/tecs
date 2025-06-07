// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type KeysOfUnion<T> = T extends any ? keyof T : never;

export type Simplify<T> = {
  [K in keyof T]: T[K] extends object ? Simplify<T[K]> : T[K];
} & {};

export type DeepReadonly<T> = Readonly<{
  [K in keyof T]: DeepReadonly<T[K]>;
}>;

