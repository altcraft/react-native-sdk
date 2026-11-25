import type { CategoryData } from '@altcraft/core';
import type { AltcraftInAppPlatform } from './platform/altcraft_inapp_platform';
import { TurboModuleAltcraftInApp } from './platform/turbo_module_altcraft_inapp';
import { inAppModuleEvents } from './module_events';
import type { InAppModuleEvents } from './module_events';

/** Options for In-App subscription operations. */
export type InAppSubscribeOptions = {
  /** Execution mode (see {@link PushSubscribeOptions.sync}). */
  sync?: boolean | null;
  /** Optional profile fields to attach to the request. */
  profileFields?: Record<string, unknown> | null;
  /** Optional custom fields to attach to the request. */
  customFields?: Record<string, unknown> | null;
  /** Optional categories list. */
  cats?: CategoryData[] | null;
  /** Optional flag to replace an existing subscription. */
  replace?: boolean | null;
  /** Optional flag to skip trigger execution on the server. */
  skipTriggers?: boolean | null;
};

/** Easing curve applied to an In-App animation. */
export type InAppAnimationEasing =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut';

/**
 * Raw transform parameters for animating an In-App view.
 *
 * Neutral values are `alpha` 1, `translate` 0, `scale` 1 and `rotation` 0.
 * When only a `*From` value is provided, the animation ends at the neutral
 * value; when only a `*To` value is provided, it starts at the neutral value.
 * An empty object disables the custom animation for that campaign.
 *
 * Distances are expressed in density-independent pixels (dp on Android,
 * points on iOS) and rotation values are expressed in degrees.
 */
export type InAppAnimationSpec = {
  /** Animation duration in milliseconds. Defaults to `350`. */
  durationMs?: number | null;
  /** Delay before the animation starts, in milliseconds. Defaults to `0`. */
  delayMs?: number | null;
  /** Easing curve. Defaults to `'easeInOut'`. */
  easing?: InAppAnimationEasing | null;
  /** Starting opacity. */
  alphaFrom?: number | null;
  /** Target opacity. */
  alphaTo?: number | null;
  /** Starting horizontal translation. */
  translateXFrom?: number | null;
  /** Target horizontal translation. */
  translateXTo?: number | null;
  /** Starting vertical translation. */
  translateYFrom?: number | null;
  /** Target vertical translation. */
  translateYTo?: number | null;
  /** Starting horizontal scale. */
  scaleXFrom?: number | null;
  /** Target horizontal scale. */
  scaleXTo?: number | null;
  /** Starting vertical scale. */
  scaleYFrom?: number | null;
  /** Target vertical scale. */
  scaleYTo?: number | null;
  /** Starting rotation in degrees. */
  rotationFrom?: number | null;
  /** Target rotation in degrees. */
  rotationTo?: number | null;
};

/**
 * In-App animation configuration.
 *
 * The configuration is resolved for each shown campaign: a matching entry in
 * {@link InAppAnimationConfig.campaigns} takes precedence over
 * {@link InAppAnimationConfig.default}. A `null` campaign entry disables the
 * custom animation for that campaign.
 */
export type InAppAnimationConfig = {
  /** Animation applied to campaigns without a specific entry. */
  default?: InAppAnimationSpec | null;
  /** Per-campaign overrides keyed by the campaign identifier. */
  campaigns?: { [campaignId: string]: InAppAnimationSpec | null } | null;
};

/** Handler receiving raw JSON content of a JSON-type In-App campaign. */
export type JsonContentHandler = (json: string) => void;

/**
 * Provides access to In-App placements with JSON content.
 *
 * JSON-type campaigns are not displayed by the SDK: the raw campaign JSON is
 * delivered to the registered handler instead. The native SDKs support a
 * single subscriber, so a new `subscribe` call replaces the previous handler.
 */
export type JsonContentApi = {
  /** Registers a handler receiving raw JSON content. */
  subscribe(handler: JsonContentHandler): void;
  /** Removes the current handler. */
  unsubscribe(): void;
};

/**
 * In-App module of the Altcraft SDK.
 *
 * Provides In-App subscription management, screen tracking, triggers,
 * placement requests, animation configuration and JSON content delivery for
 * Android and iOS.
 */
export class AltcraftInApp {
  /** The current platform interface implementation. */
  static platform: AltcraftInAppPlatform = new TurboModuleAltcraftInApp();

  /** Messages of the native In-App module events. */
  static readonly moduleEvents: InAppModuleEvents = inAppModuleEvents;

  /** Provides access to In-App placements with JSON content. */
  static readonly jsonContent: JsonContentApi = {
    subscribe(handler: JsonContentHandler): void {
      AltcraftInApp.platform.jsonContentSubscribe(handler);
    },
    unsubscribe(): void {
      AltcraftInApp.platform.jsonContentUnsubscribe();
    },
  };

  /** Subscribes to In-App notifications. */
  static inAppSubscribe(options: InAppSubscribeOptions = {}): Promise<void> {
    return AltcraftInApp.platform.inAppSubscribe(options);
  }

  /** Unsubscribes from In-App notifications. */
  static inAppUnsubscribe(options: InAppSubscribeOptions = {}): Promise<void> {
    return AltcraftInApp.platform.inAppUnsubscribe(options);
  }

  /** Sets the current screen for In-App placement matching. */
  static setScreen(screen: string): void {
    AltcraftInApp.platform.setScreen(screen);
  }

  /** Fires an In-App trigger by name. */
  static trigger(name: string): void {
    AltcraftInApp.platform.trigger(name);
  }

  /** Requests In-App placements. */
  static getPlacements(): void {
    AltcraftInApp.platform.getPlacements();
  }

  /**
   * Sets the animation applied when an In-App view is shown.
   *
   * The configuration is applied to every subsequent presentation; call
   * {@link setAnimation} again to replace it. Closing animations are not
   * supported by the native SDKs.
   *
   * @param config Animation configuration, or `null` to disable it.
   */
  static setAnimation(config: InAppAnimationConfig | null): void {
    AltcraftInApp.platform.setAnimation(config);
  }

  /** Disables the In-App show animation. */
  static clearAnimation(): void {
    AltcraftInApp.platform.setAnimation(null);
  }
}

export type { CategoryData };
