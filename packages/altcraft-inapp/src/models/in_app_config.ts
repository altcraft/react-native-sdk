/**
 * In-App module configuration passed to the SDK builder.
 *
 * Mirrors the native in-app configuration extension. Omitted values fall back
 * to the native defaults (auto request enabled, 30 minutes, 500 placements).
 */
export type InAppConfig = {
  /** Enables automatic requests of In-App placements. */
  inAppAutoRequest?: boolean | null;
  /**
   * Interval between automatic placement requests, in milliseconds.
   *
   * The native SDKs apply a minimum of 15 minutes; lower values are clamped on
   * the native side.
   */
  placementsRequestIntervalMs?: number | null;
  /** Maximum number of placements kept in local storage. */
  maxPlacements?: number | null;
};
