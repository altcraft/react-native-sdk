import { toAltcraftException } from '@altcraft/push';
import { Utilities } from '@altcraft/core';
import type { AltcraftProfilePlatform } from './platform/altcraft_profile_platform';
import { TurboModuleAltcraftProfile } from './platform/turbo_module_altcraft_profile';
import { profileModuleEvents } from './module_events';
import type { ProfileModuleEvents } from './module_events';

/** Options for updating profile fields. */
export type UpdateProfileOptions = {
  /** Optional profile fields to update. */
  profileFields?: Record<string, unknown> | null;
  /** Optional flag to skip trigger execution on the server. */
  skipTriggers?: boolean | null;
};

/**
 * Profile module of the Altcraft SDK.
 *
 * Provides profile field updates for Android and iOS.
 */
export class AltcraftProfile {
  /** The current platform interface implementation. */
  static platform: AltcraftProfilePlatform = new TurboModuleAltcraftProfile();

  /** Messages of the native profile module events. */
  static readonly moduleEvents: ProfileModuleEvents = profileModuleEvents;

  /** Updates profile fields on the server. */
  static updateProfileFields(options: UpdateProfileOptions = {}): void {
    AltcraftProfile.platform.updateProfileFields(options);
  }
}

export { toAltcraftException, Utilities };
