/** Action field operation types supported by the native SDK. */
export type ActionFieldType =
  | 'set'
  | 'unset'
  | 'incr'
  | 'add'
  | 'delete'
  | 'upsert';

/** Serialized action field entry accepted by the native SDK. */
export type ActionFieldEntry = Record<string, Record<string, unknown>>;

/**
 * Builder producing action field entries compatible with the native SDK's
 * ActionFieldBuilder.
 */
export class ActionFieldBuilder {
  private readonly key: string;

  constructor(key: string) {
    this.key = key;
  }

  /** Sets the field to the given value. */
  set(value: unknown): ActionFieldEntry {
    return { [this.key]: { action: 'set', value } };
  }

  /** Unsets the field value. */
  unset(value: unknown): ActionFieldEntry {
    return { [this.key]: { action: 'unset', value } };
  }

  /** Increments a numeric field. */
  incr(value: unknown): ActionFieldEntry {
    return { [this.key]: { action: 'incr', value } };
  }

  /** Adds a value to a collection field. */
  add(value: unknown): ActionFieldEntry {
    return { [this.key]: { action: 'add', value } };
  }

  /** Deletes a value from a collection field. */
  delete(value: unknown): ActionFieldEntry {
    return { [this.key]: { action: 'delete', value } };
  }

  /** Upserts a value in a collection field. */
  upsert(value: unknown): ActionFieldEntry {
    return { [this.key]: { action: 'upsert', value } };
  }
}

/** Creates an action field builder for the given key. */
export function actionField(key: string): ActionFieldBuilder {
  return new ActionFieldBuilder(key);
}
