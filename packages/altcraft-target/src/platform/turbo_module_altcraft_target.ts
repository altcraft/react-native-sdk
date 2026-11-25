import { toAltcraftException, Utilities } from '@altcraft/core';
import NativeTarget from '../native/NativeTarget';
import type { AltcraftTargetPlatform } from './altcraft_target_platform';
import type { MobileEventOptions } from '../altcraft_target';
import { subscriptionToNative } from '../models/subscription';
import { utmToNative } from '../models/utm';

/**
 * Default target platform implementation backed by the native TurboModule.
 *
 * Mirrors `MethodChannelAltcraftTarget` from the Flutter SDK.
 */
export class TurboModuleAltcraftTarget implements AltcraftTargetPlatform {
  /** Sends a target event to the server. */
  sendTarget(options: MobileEventOptions): void {
    try {
      NativeTarget.sendTarget({
        sid: options.sid,
        eventName: options.eventName,
        sendMessageId: options.sendMessageId ?? null,
        payload: Utilities.toNativeStringMap(options.payload),
        matching: Utilities.toNativeStringMap(options.matching),
        matchingType: options.matchingType ?? null,
        profileFields: Utilities.toNativeStringMap(options.profileFields),
        subscription: subscriptionToNative(options.subscription ?? null),
        utm:
          options.utm != null
            ? (utmToNative(options.utm) as UTMNative)
            : null,
      });
    } catch (e) {
      throw toAltcraftException(e, 'sendTarget failed');
    }
  }
}

/** Native UTM shape (all fields nullable). */
type UTMNative = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  keyword: string | null;
  temp: string | null;
};

export type { MobileEventOptions };
