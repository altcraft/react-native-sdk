import { Platform } from 'react-native';

/**
 * Profile module events.
 *
 * Holds the messages emitted by the native SDK. Catalogs of both platforms
 * are merged: a name available on only one platform keeps that platform's
 * message and never matches events on the other platform.
 */

/** Android event messages. */
const androidEvents = {
  requestDataIsNull: 'profile update request data is null',
  retryLimit: 'profile update retry limit',
  requestSuccessful: 'successful request: profile/update',
  requestFailed: 'failed request: profile/update'
} as const;

/** iOS event messages. */
const iosEvents = {
  profileUpdateRequestDataIsNil: 'profile update request data is nil',
  profileUpdateRequestSuccessful: 'successful request: profile/update',
  profileUpdateRequestFailed: 'failed request: profile/update'
} as const;

/** Profile module events. */
export type ProfileModuleEvents = {
  readonly [K in keyof typeof androidEvents | keyof typeof iosEvents]: string;
};

/** Event messages resolved for the current platform. */
const platformEvents: Record<string, string> =
  Platform.OS === 'ios' ? { ...iosEvents } : { ...androidEvents };

/** Module events resolved for the current platform. */
export const profileModuleEvents: ProfileModuleEvents = {
  ...androidEvents,
  ...iosEvents,
  ...platformEvents,
};
