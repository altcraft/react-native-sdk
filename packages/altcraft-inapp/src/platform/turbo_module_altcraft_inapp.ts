import { NativeEventEmitter, NativeModules } from 'react-native';
import { AltcraftChannels, Utilities } from '@altcraft/core';
import {
  categoryDataToNative,
  toAltcraftException,
} from '@altcraft/core';
import type { CategoryData } from '@altcraft/core';
import NativeInApp from '../native/NativeInApp';
import type {
  InAppAnimationConfig as NativeAnimationConfig,
  InAppAnimationSpec as NativeAnimationSpec,
} from '../native/NativeInApp';
import type { AltcraftInAppPlatform } from './altcraft_inapp_platform';
import type {
  InAppAnimationConfig,
  InAppAnimationSpec,
  InAppSubscribeOptions,
  JsonContentHandler,
} from '../altcraft_inapp';

/** Type of the shared native event emitter module. */
type EmitterModule = {
  addListener(eventName: string): void;
  removeListeners(count: number): void;
};

/**
 * Default In-App platform implementation backed by the native TurboModule.
 *
 * Mirrors `MethodChannelAltcraftInApp` from the Flutter SDK.
 */
export class TurboModuleAltcraftInApp implements AltcraftInAppPlatform {
  private eventEmitter: NativeEventEmitter | null = null;
  private jsonContentSubscription: { remove: () => void } | null = null;
  private jsonContentHandler: JsonContentHandler | null = null;

  /** Creates or updates an In-App subscription. */
  async inAppSubscribe(options: InAppSubscribeOptions): Promise<void> {
    try {
      NativeInApp.inAppSubscribe(toNativeOptions(options));
    } catch (e) {
      throw toAltcraftException(e, 'inAppSubscribe failed');
    }
  }

  /** Unsubscribes from In-App notifications. */
  async inAppUnsubscribe(options: InAppSubscribeOptions): Promise<void> {
    try {
      NativeInApp.inAppUnsubscribe(toNativeOptions(options));
    } catch (e) {
      throw toAltcraftException(e, 'inAppUnsubscribe failed');
    }
  }

  /** Sets the current screen for In-App placement matching. */
  setScreen(screen: string): void {
    NativeInApp.setScreen(screen);
  }

  /** Fires an In-App trigger by name. */
  trigger(name: string): void {
    NativeInApp.trigger(name);
  }

  /** Requests In-App placements. */
  getPlacements(): void {
    NativeInApp.getPlacements();
  }

  /** Sets or clears the In-App show animation configuration. */
  setAnimation(config: InAppAnimationConfig | null): void {
    NativeInApp.setAnimation(
      config != null ? toNativeAnimationConfig(config) : null
    );
  }

  /** Registers a handler receiving raw JSON content of JSON-type campaigns. */
  jsonContentSubscribe(handler: JsonContentHandler): void {
    this.jsonContentHandler = handler;
    if (this.jsonContentSubscription === null) {
      this.jsonContentSubscription = this.ensureEmitter().addListener(
        AltcraftChannels.inAppJsonContent,
        (payload: unknown) => {
          this.deliverJsonContent(payload);
        }
      );
    }
    NativeInApp.jsonContentSubscribe();
  }

  /** Removes the current JSON content handler. */
  jsonContentUnsubscribe(): void {
    this.jsonContentHandler = null;
    this.jsonContentSubscription?.remove();
    this.jsonContentSubscription = null;
    NativeInApp.jsonContentUnsubscribe();
  }

  /** Delivers JSON content to the current handler. */
  private deliverJsonContent(payload: unknown): void {
    const handler = this.jsonContentHandler;
    if (handler === null) {
      return;
    }
    const json = typeof payload === 'string' ? payload : String(payload ?? '');
    try {
      handler(json);
    } catch (e) {
      console.warn('[AltcraftInApp] json content handler error:', e);
    }
  }

  /** Returns the shared native event emitter, creating it on demand. */
  private ensureEmitter(): NativeEventEmitter {
    if (this.eventEmitter === null) {
      const module = NativeModules.SDKEventEmitter as EmitterModule | undefined;
      this.eventEmitter = new NativeEventEmitter(module);
    }
    return this.eventEmitter;
  }
}

/** Applies defaults to a single animation spec. */
function toNativeAnimationSpec(spec: InAppAnimationSpec): NativeAnimationSpec {
  return {
    durationMs: spec.durationMs ?? 350,
    delayMs: spec.delayMs ?? 0,
    easing: spec.easing ?? 'easeInOut',
    alphaFrom: spec.alphaFrom ?? null,
    alphaTo: spec.alphaTo ?? null,
    translateXFrom: spec.translateXFrom ?? null,
    translateXTo: spec.translateXTo ?? null,
    translateYFrom: spec.translateYFrom ?? null,
    translateYTo: spec.translateYTo ?? null,
    scaleXFrom: spec.scaleXFrom ?? null,
    scaleXTo: spec.scaleXTo ?? null,
    scaleYFrom: spec.scaleYFrom ?? null,
    scaleYTo: spec.scaleYTo ?? null,
    rotationFrom: spec.rotationFrom ?? null,
    rotationTo: spec.rotationTo ?? null,
  };
}

/** Normalizes the animation configuration for the native bridge. */
function toNativeAnimationConfig(
  config: InAppAnimationConfig
): NativeAnimationConfig {
  const campaigns: { [campaignId: string]: NativeAnimationSpec } = {};
  if (config.campaigns != null) {
    for (const [campaignId, spec] of Object.entries(config.campaigns)) {
      campaigns[campaignId] = spec != null ? toNativeAnimationSpec(spec) : {};
    }
  }
  return {
    default:
      config.default != null ? toNativeAnimationSpec(config.default) : null,
    campaigns: config.campaigns != null ? campaigns : null,
  };
}

/** Converts In-App subscription options into the native options object. */
function toNativeOptions(options: InAppSubscribeOptions): {
  sync: boolean | null;
  profileFields: Record<string, string> | null;
  customFields: Record<string, string> | null;
  cats: CategoryData[] | null;
  replace: boolean | null;
  skipTriggers: boolean | null;
} {
  return {
    sync: options.sync != null ? options.sync : true,
    profileFields: Utilities.toNativeStringMap(options.profileFields),
    customFields: Utilities.toNativeStringMap(options.customFields),
    cats: options.cats?.map(categoryDataToNative) ?? null,
    replace: options.replace ?? null,
    skipTriggers: options.skipTriggers ?? null,
  };
}
