import { NativeEventEmitter, NativeModules } from 'react-native';

import { AltcraftChannels } from '../channel_names';
import { toAltcraftException } from '../exceptions/altcraft_exception';
import type { AltcraftConfig } from '../models/altcraft_config';
import { altcraftConfigToNative } from '../models/altcraft_config';
import type { SdkEvent } from '../models/sdk_event';
import { sdkEventFromNative } from '../models/sdk_event';
import { Utilities } from '../utilities';
import type { AltcraftCorePlatform } from './altcraft_core_platform';
import NativeCore from '../native/NativeCore';

/** Type of the shared native event emitter module. */
type EmitterModule = {
  addListener(eventName: string): void;
  removeListeners(count: number): void;
};

/**
 * Default core platform implementation backed by the native TurboModule.
 *
 * Mirrors `MethodChannelAltcraftCore` from the Flutter SDK.
 */
export class TurboModuleAltcraftCore implements AltcraftCorePlatform {
  private eventEmitter: NativeEventEmitter | null = null;
  private nativeSubscription: { remove: () => void } | null = null;
  private handlers = new Set<(event: SdkEvent) => void>();
  private jwtHandler: ((event: unknown) => void) | null = null;

  // ---- Initialization ----

  /** Initializes the Altcraft SDK core with the given configuration. */
  async initialize(config: AltcraftConfig): Promise<void> {
    try {
      await NativeCore.initialize(
        altcraftConfigToNative(config) as AltcraftConfig
      );
    } catch (e) {
      throw toAltcraftException(e, 'initialize failed');
    }
  }

  // ---- SDK Events ----

  /** Subscribes a handler to native SDK events. */
  subscribeToEvents(handler: (event: SdkEvent) => void): void {
    this.handlers.add(handler);

    if (this.nativeSubscription === null) {
      NativeCore.subscribeToEvents();
      this.nativeSubscription = this.ensureEmitter().addListener(
        AltcraftChannels.events,
        (...args: unknown[]) => {
          const event = sdkEventFromNative(args[0]);
          if (!event) return;
          for (const h of Array.from(this.handlers)) {
            try {
              h(event);
            } catch (e) {
              console.warn('[AltcraftCore] event handler error:', e);
            }
          }
        }
      );
    }
  }

  /** Unsubscribes a handler from native SDK events. */
  unsubscribeFromEvents(handler: (event: SdkEvent) => void): void {
    this.handlers.delete(handler);

    if (this.handlers.size === 0 && this.nativeSubscription !== null) {
      this.nativeSubscription.remove();
      this.nativeSubscription = null;
      NativeCore.unsubscribeFromEvents();
    }
  }

  // ---- State ----

  /** Clears all SDK data. */
  async clear(): Promise<void> {
    try {
      await NativeCore.clear();
    } catch (e) {
      throw toAltcraftException(e, 'clear failed');
    }
  }

  // ---- Session (Android) ----

  /** Unlocks initial operations in the current session (Android). */
  unlockInitialOperationsInThisSession(): void {
    NativeCore.unlockInitialOperationsInThisSession();
  }

  // ---- UserDefaults ----

  /** Stores a string value in native storage. */
  setUserDefaultsValue(
    suiteName: string | null,
    key: string,
    value: string | null
  ): void {
    NativeCore.setUserDefaultsValue(suiteName, key, value);
  }

  /** Sets the App Group for UserDefaults (iOS). */
  setAppGroup(groupName: string | null): void {
    NativeCore.setAppGroup(groupName);
  }

  // ---- Authentication ----

  /** Registers a JWT provider invoked by the native SDK when it needs a token. */
  setJwtProvider(provider: () => Promise<string | null>): void {
    // Drop the previous handler first.
    if (this.jwtHandler !== null) {
      this.ensureEmitter().removeAllListeners(
        AltcraftChannels.jwtRequest
      );
      this.jwtHandler = null;
    }

    this.jwtHandler = (payload: unknown) => {
      const requestId = readRequestId(payload);
      if (requestId === null) return;

      Promise.resolve()
        .then(provider)
        .then((token) => {
          NativeCore.resolveJwt(requestId, token ?? null);
        })
        .catch(() => {
          NativeCore.resolveJwt(requestId, null);
        });
    };

    this.ensureEmitter().addListener(
      AltcraftChannels.jwtRequest,
      this.jwtHandler
    );
    NativeCore.setJwtProvider();
  }

  /** Starts SDK authentication. */
  authenticate(): void {
    NativeCore.authenticate();
  }

  /** Logs the user out. */
  logOut(): void {
    NativeCore.logOut();
  }

  /** Returns whether the user is authenticated. */
  async isAuthenticated(): Promise<boolean> {
    try {
      return await NativeCore.isAuthenticated();
    } catch (e) {
      throw toAltcraftException(e, 'isAuthenticated failed');
    }
  }

  // ---- Helpers ----

  /** Returns the shared native event emitter, creating it on demand. */
  private ensureEmitter(): NativeEventEmitter {
    if (this.eventEmitter === null) {
      const module = NativeModules.SDKEventEmitter as EmitterModule | undefined;
      this.eventEmitter = new NativeEventEmitter(module);
    }
    return this.eventEmitter;
  }
}

/** Reads the numeric request id from a JWT request payload. */
function readRequestId(payload: unknown): number | null {
  if (payload == null) return null;
  if (typeof payload === 'number') return Math.trunc(payload);
  if (typeof payload === 'object') {
    const value = (payload as Record<string, unknown>).requestId;
    if (typeof value === 'number') return Math.trunc(value);
    if (value != null) {
      const parsed = parseInt(String(value), 10);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return null;
}

export { Utilities };
