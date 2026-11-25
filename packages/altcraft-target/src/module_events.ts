import { Platform } from 'react-native';

/**
 * Target module events.
 *
 * Holds the messages emitted by the native SDK. Catalogs of both platforms
 * are merged: a name available on only one platform keeps that platform's
 * message and never matches events on the other platform.
 */

/** Android event messages. */
const androidEvents = {
  partsIsNull: 'target request parts is null',
  retryLimit: 'target request retry limit',
  invalidPayload: 'invalid target payload: not all values are primitives',
  requestDataIsNull: 'target request data is null',
  requestSuccessful: 'successful target request: event/post',
  requestFailed: 'failed target request: event/post'
} as const;

/** iOS event messages. */
const iosEvents = {
  mobileRequestDataIsNil: 'mobile event request data is nil',
  mobileEventRequestSuccessful: 'successful request: event/post',
  mobileEventRequestFailed: 'failed request: event/post'
} as const;

/** Target module events. */
export type TargetModuleEvents = {
  readonly [K in keyof typeof androidEvents | keyof typeof iosEvents]: string;
};

/** Event messages resolved for the current platform. */
const platformEvents: Record<string, string> =
  Platform.OS === 'ios' ? { ...iosEvents } : { ...androidEvents };

/** Module events resolved for the current platform. */
export const targetModuleEvents: TargetModuleEvents = {
  ...androidEvents,
  ...iosEvents,
  ...platformEvents,
};
