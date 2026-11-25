/**
 * Shared bridge conversion helpers used by all Altcraft modules.
 */
export class Utilities {
  /**
   * Converts a JS object to a string map for the native bridge.
   *
   * Drops null/undefined values; numbers, booleans and bigints are
   * stringified; other types are serialized as JSON.
   */
  static toNativeStringMap(
    input: Record<string, unknown> | null | undefined
  ): Record<string, string> | null {
    if (input == null) return null;

    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value == null) continue;
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'bigint'
      ) {
        result[key] = String(value);
        continue;
      }
      try {
        result[key] = JSON.stringify(value) ?? String(value);
      } catch {
        result[key] = String(value);
      }
    }

    return Object.keys(result).length > 0 ? result : null;
  }

  /**
   * Serializes any value to a string for TurboModule codegen
   * (which does not support `any`).
   */
  static toUserDefaultsString(value: unknown): string | null {
    if (value == null) return null;
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return String(value);
    }
    try {
      return JSON.stringify(value) ?? String(value);
    } catch {
      return String(value);
    }
  }
}
