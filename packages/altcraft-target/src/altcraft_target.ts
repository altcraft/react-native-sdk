import { Utilities } from '@altcraft/core';
import type { Subscription } from './models/subscription';
import { subscriptionToNative } from './models/subscription';
import type { UTM } from './models/utm';
import { utmToNative } from './models/utm';
import type { AltcraftTargetPlatform } from './platform/altcraft_target_platform';
import { TurboModuleAltcraftTarget } from './platform/turbo_module_altcraft_target';
import { targetModuleEvents } from './module_events';
import type { TargetModuleEvents } from './module_events';

/** Options for sending a mobile event. */
export type MobileEventOptions = {
  /** Pixel identifier. */
  sid: string;
  /** Event name. */
  eventName: string;
  /** Optional message identifier to link the event. */
  sendMessageId?: string | null;
  /** Optional event payload. */
  payload?: Record<string, unknown> | null;
  /** Optional matching parameters. */
  matching?: Record<string, unknown> | null;
  /** Optional matching mode/type. */
  matchingType?: string | null;
  /** Optional profile fields. */
  profileFields?: Record<string, unknown> | null;
  /** Optional subscription info to attach (email/sms/push/cc_data). */
  subscription?: Subscription | null;
  /** Optional UTM tags for attribution. */
  utm?: UTM | null;
};

/**
 * Target module of the Altcraft SDK.
 *
 * Provides mobile event tracking with payload, matching, subscription,
 * and UTM data for Android and iOS.
 */
export class AltcraftTarget {
  /** The current platform interface implementation. */
  static platform: AltcraftTargetPlatform = new TurboModuleAltcraftTarget();

  /** Messages of the native target module events. */
  static readonly moduleEvents: TargetModuleEvents = targetModuleEvents;

  /** Sends a target event to the Altcraft platform. */
  static sendTarget(options: MobileEventOptions): void {
    AltcraftTarget.platform.sendTarget(options);
  }
}

export { Utilities, subscriptionToNative, utmToNative };
export type { Subscription, UTM };
