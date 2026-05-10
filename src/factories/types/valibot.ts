import type * as v from 'valibot';

/**
 * Compile-time bidirectional sync between a TypeScript type and a Valibot schema.
 *
 * Vendored from openspike (`@os/core/types/valibot`) — the agent-skills repo is
 * standalone and cannot depend on `@os/core`. Zero runtime cost: the returned
 * function is the identity.
 *
 * Usage: `export const FooSchema = alignSchema<Foo>()(v.object({ ... }))`. The
 * call site fails to compile if the schema produces keys the type lacks, or if
 * the type has keys the schema does not produce.
 */
export function alignSchema<T>(): <S extends v.GenericSchema<T>>(
  schema: S &
    (T extends v.InferOutput<S>
      ? S
      : {
          __error: 'Schema produces keys not in type';
          extra: Exclude<keyof v.InferOutput<S>, keyof T>;
        }),
) => S {
  return ((schema: unknown) => schema) as ReturnType<typeof alignSchema<T>>;
}

/** A schema annotated for `v.variant` discrimination on key `K`. */
export type DiscriminatedSchema<
  T,
  K extends keyof T,
  Val extends string = T[K] & string,
> = v.GenericSchema<T> &
  v.ObjectSchema<Readonly<Record<K, v.LiteralSchema<Val, undefined>>>, undefined>;
