import type { Subscription } from './NativeSdk';

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
    if (subscription.priority != null) result.priority = String(subscription.priority);

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
