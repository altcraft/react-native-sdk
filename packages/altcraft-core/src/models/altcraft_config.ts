/// Application information for Firebase/FCM integration.
export type AppInfo = {
  appID: string;
  appIID: string;
  appVer: string;
};

/**
 * Configuration for initializing the Altcraft SDK.
 *
 * Contains core parameters plus serialized module configurations. Module
 * packages contribute their options through `AltcraftConfigBuilder` extensions
 * (for example `pushConfig` from `@altcraft/push`), so this type does not
 * depend on any specific module.
 */
export type AltcraftConfig = {
  /** API URL for the Altcraft backend. */
  apiUrl: string;
  /** Optional RToken for authentication. */
  rToken?: string | null;
  /** Optional application info (Firebase app ID, instance ID, version). */
  appInfo?: AppInfo | null;
  /** Optional flag to enable SDK logging. */
  enableLogging?: boolean | null;
  /**
   * Serialized module configurations keyed by module identifier.
   *
   * Produced by `AltcraftConfigBuilder`; the core module forwards this value to
   * the native SDK without interpreting its contents.
   */
  moduleConfigs?: string | null;
};

/**
 * Converts config to a plain object for the native bridge.
 *
 * Module-specific options are contributed by module packages through
 * `AltcraftConfigBuilder` extensions and passed as serialized
 * `moduleConfigs`.
 */
export function altcraftConfigToNative(
  config: AltcraftConfig
): Record<string, unknown> {
  const map: Record<string, unknown> = { apiUrl: config.apiUrl };
  if (config.rToken != null) map.rToken = config.rToken;
  if (config.appInfo != null) {
    map.appInfo = {
      appID: config.appInfo.appID,
      appIID: config.appInfo.appIID,
      appVer: config.appInfo.appVer,
    };
  }
  if (config.enableLogging != null) map.enableLogging = config.enableLogging;
  if (config.moduleConfigs != null) map.moduleConfigs = config.moduleConfigs;
  return map;
}
