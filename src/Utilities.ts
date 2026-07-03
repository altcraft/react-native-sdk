import type { Subscription } from './NativeSdk';

/** Supported action types for profile field manipulation. */
export type ActionFieldType =
  | 'set'
  | 'unset'
  | 'incr'
  | 'add'
  | 'delete'
  | 'upsert';

/**
 * Builder for structured profile field actions.
 *
 * Produces a map entry compatible with the native SDK's ActionFieldBuilder.
 * The resulting map is intended to be merged into `profileFields` before
 * passing to `pushSubscribe`, `updateProfileFields`, or similar APIs.
 */
export class ActionFieldBuilder {
  private key: string;

  constructor(key: string) {
    this.key = key;
  }

  /** Set field to a specific value. */
  set(value: unknown): Record<string, unknown> {
    return { [this.key]: { action: 'set', value } };
  }

  /** Unset (remove) a field value. */
  unset(value: unknown): Record<string, unknown> {
    return { [this.key]: { action: 'unset', value } };
  }

  /** Increment a numeric field by the given value. */
  incr(value: unknown): Record<string, unknown> {
    return { [this.key]: { action: 'incr', value } };
  }

  /** Add a value to a set/array field. */
  add(value: unknown): Record<string, unknown> {
    return { [this.key]: { action: 'add', value } };
  }

  /** Delete a value from a set/array field. */
  delete(value: unknown): Record<string, unknown> {
    return { [this.key]: { action: 'delete', value } };
  }

  /** Upsert: set if missing, update if exists. */
  upsert(value: unknown): Record<string, unknown> {
    return { [this.key]: { action: 'upsert', value } };
  }
}

/**
 * Creates an ActionFieldBuilder for the given field key.
 *
 * @param key Profile field key to operate on.
 * @returns Builder instance with action methods.
 */
export function actionField(key: string): ActionFieldBuilder {
  return new ActionFieldBuilder(key);
}

export class Utilities {
  /** Converts a JS object to { [key: string]: string }
   *  for the RN bridge; drops null/undefined. */
  static toNativeStringMap(
    input: Record<string, unknown> | null
  ): Record<string, string> | null {
    if (input == null) return null;

    const out: Record<string, string> = {};

    for (const [key, value] of Object.entries(input)) {
      if (value == null) continue;

      switch (typeof value) {
        case 'string':
          out[key] = value;
          break;

        case 'number':
        case 'boolean':
        case 'bigint':
          out[key] = String(value);
          break;

        default:
          try {
            out[key] = JSON.stringify(value);
          } catch {
            out[key] = String(value);
          }
          break;
      }
    }

    return Object.keys(out).length > 0 ? out : null;
  }

  /**
   * New Arch safe:
   * TurboModule codegen does NOT support `any`.
   * Therefore, we serialize any value for UserDefaults into `string`.
   */
  static toUserDefaultsString(value: unknown): string | null {
    if (value == null) return null;

    const t = typeof value;

    if (t === 'string') return String(value);
    if (t === 'number' || t === 'boolean') return String(value);

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  /** Converts Subscription object to native string map format. */
  static subscriptionToNativeMap(
    subscription: Subscription | null
  ): Record<string, string> | null {
    if (subscription == null) return null;

    const result: Record<string, string> = {
      type: subscription.type,
      resource_id: String(subscription.resource_id),
    };

    if (subscription.status != null) result.status = subscription.status;
    if (subscription.priority != null)
      result.priority = String(subscription.priority);

    if (subscription.custom_fields != null) {
      try {
        result.custom_fields = JSON.stringify(subscription.custom_fields);
      } catch {
        result.custom_fields = '{}';
      }
    }

    if (subscription.cats != null) {
      try {
        result.cats = JSON.stringify(subscription.cats);
      } catch {
        result.cats = '[]';
      }
    }

    switch (subscription.type) {
      case 'email':
        result.email = subscription.email;
        break;

      case 'sms':
        result.phone = subscription.phone;
        break;

      case 'push':
        result.provider = subscription.provider;
        result.subscription_id = subscription.subscription_id;
        break;

      case 'cc_data':
        try {
          result.cc_data = JSON.stringify(subscription.cc_data);
        } catch {
          result.cc_data = '{}';
        }
        break;
    }

    return result;
  }
}
