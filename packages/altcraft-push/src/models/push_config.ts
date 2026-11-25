/**
 * Push module configuration passed to the SDK builder.
 *
 * Mirrors the native push configuration extension. On Android, the icon,
 * receiver modules, and notification channel options are applied; iOS uses
 * only `providerPriority`.
 */
export type PushConfig = {
  /** Push provider identifiers ordered by priority. */
  providerPriority?: string[] | null;
  /**
   * Android-only: notification icon resource ID.
   *
   * Takes precedence over `iconName` when both are provided.
   */
  icon?: number | null;
  /**
   * Android-only: notification icon resource name resolved via
   * `getIdentifier` (`drawable`, then `mipmap`).
   */
  iconName?: string | null;
  /**
   * Android-only: package name prefixes containing push receiver
   * implementations.
   */
  pushReceiverModules?: string[] | null;
  /** Android-only: custom notification channel name. */
  pushChannelName?: string | null;
  /** Android-only: custom notification channel description. */
  pushChannelDescription?: string | null;
};
