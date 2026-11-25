import { toAltcraftException, Utilities } from '@altcraft/core';
import NativeProfile from '../native/NativeProfile';
import type { AltcraftProfilePlatform } from './altcraft_profile_platform';
import type { UpdateProfileOptions } from '../altcraft_profile';

/**
 * Default profile platform implementation backed by the native TurboModule.
 *
 * Mirrors `MethodChannelAltcraftProfile` from the Flutter SDK.
 */
export class TurboModuleAltcraftProfile implements AltcraftProfilePlatform {
  /** Updates profile fields on the server. */
  updateProfileFields(options: UpdateProfileOptions): void {
    try {
      NativeProfile.updateProfileFields({
        profileFields: Utilities.toNativeStringMap(options.profileFields),
        skipTriggers: options.skipTriggers ?? null,
      });
    } catch (e) {
      throw toAltcraftException(e, 'updateProfileFields failed');
    }
  }
}
