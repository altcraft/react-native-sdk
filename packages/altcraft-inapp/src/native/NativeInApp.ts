import { TurboModuleRegistry, type TurboModule } from 'react-native';

/** Subscription category metadata. */
export type CategoryData = {
  name?: string | null;
  title?: string | null;
  steady?: boolean | null;
  active?: boolean | null;
};

/** In-App subscription operation options. */
export type InAppSubscribeOptions = {
  sync: boolean | null;
  profileFields: { [key: string]: string } | null;
  customFields: { [key: string]: string } | null;
  cats: CategoryData[] | null;
  replace: boolean | null;
  skipTriggers: boolean | null;
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
 */
export type InAppAnimationSpec = {
  durationMs?: number | null;
  delayMs?: number | null;
  easing?: InAppAnimationEasing | null;
  alphaFrom?: number | null;
  alphaTo?: number | null;
  translateXFrom?: number | null;
  translateXTo?: number | null;
  translateYFrom?: number | null;
  translateYTo?: number | null;
  scaleXFrom?: number | null;
  scaleXTo?: number | null;
  scaleYFrom?: number | null;
  scaleYTo?: number | null;
  rotationFrom?: number | null;
  rotationTo?: number | null;
};

/** In-App animation configuration resolved by campaign identifier. */
export type InAppAnimationConfig = {
  default?: InAppAnimationSpec | null;
  campaigns?: { [campaignId: string]: InAppAnimationSpec } | null;
};

/**
 * In-App module TurboModule spec.
 *
 * Provides In-App subscription management, screen tracking, triggers,
 * and placement requests.
 */
export interface Spec extends TurboModule {
  /** Creates or updates In-App subscription. */
  inAppSubscribe(options: InAppSubscribeOptions | null): void;

  /** Unsubscribes from In-App notifications. */
  inAppUnsubscribe(options: InAppSubscribeOptions | null): void;

  /** Sets the current screen for In-App placement matching. */
  setScreen(screen: string): void;

  /** Fires an In-App trigger by name. */
  trigger(name: string): void;

  /** Requests In-App placements. */
  getPlacements(): void;

  /**
   * Sets the In-App animation configuration, or clears it with `null`.
   *
   * Typed as `Object` so the generated iOS protocol receives `NSDictionary`
   * (`NativeInApp.setAnimation` is an internal, pre-normalized payload).
   */
  setAnimation(config: Object | null): void;

  /** Registers the native JSON-content subscriber. */
  jsonContentSubscribe(): void;

  /** Removes the native JSON-content subscriber. */
  jsonContentUnsubscribe(): void;
}

/** Native in-app TurboModule instance. */
const NativeInApp = TurboModuleRegistry.getEnforcing<Spec>('InApp');
export default NativeInApp;
