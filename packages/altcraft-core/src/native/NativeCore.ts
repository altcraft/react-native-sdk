import { TurboModuleRegistry, type TurboModule } from 'react-native';

/** Application information for Firebase/FCM integration. */
export type AppInfo = {
  appID: string;
  appIID: string;
  appVer: string;
};

/** Configuration for initializing the Altcraft SDK. */
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
   * Module packages contribute their options through builder extensions; the
   * core module forwards this value without interpreting it.
   */
  moduleConfigs?: string | null;
};

/**
 * Core module TurboModule spec.
 *
 * Provides SDK initialization, native SDK events, JWT authentication, and
 * data management.
 */
export interface Spec extends TurboModule {
  // ---- Initialization ----

  /** Initializes the Altcraft SDK core with the given configuration. */
  initialize(config: AltcraftConfig): Promise<void>;

  // ---- SDK Events ----

  /** Subscribes to native SDK events. */
  subscribeToEvents(): void;

  /** Unsubscribes from native SDK events. */
  unsubscribeFromEvents(): void;

  /** Required by NativeEventEmitter (no-op on Android). */
  addListener(eventName: string): void;

  /** Required by NativeEventEmitter (no-op on Android). */
  removeListeners(count: number): void;

  // ---- State ----

  /** Clears all SDK data. */
  clear(): Promise<void>;

  // ---- Session (Android) ----

  /** Unlocks initial operations in the current session (Android). */
  unlockInitialOperationsInThisSession(): void;

  // ---- UserDefaults ----

  /** Stores a string value in native storage. */
  setUserDefaultsValue(
    suiteName: string | null,
    key: string,
    value: string | null
  ): void;

  /** Sets the App Group for UserDefaults (iOS). */
  setAppGroup(groupName: string | null): void;

  // ---- Authentication ----

  /** Registers a JWT provider: native requests tokens via "altcraftJwtRequest" events. */
  setJwtProvider(): void;

  /** Resolves a pending JWT request issued by the native provider. */
  resolveJwt(requestId: number, token: string | null): void;

  /** Starts SDK authentication. */
  authenticate(): void;

  /** Logs the user out. */
  logOut(): void;

  /** Returns whether the user is authenticated. */
  isAuthenticated(): Promise<boolean>;
}

/** Native core TurboModule instance. */
const NativeCore = TurboModuleRegistry.getEnforcing<Spec>('Core');
export default NativeCore;
