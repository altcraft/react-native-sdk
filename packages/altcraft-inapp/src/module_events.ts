import { Platform } from 'react-native';

/**
 * In-App module events.
 *
 * Holds the messages emitted by the native SDK. Catalogs of both platforms
 * are merged: a name available on only one platform keeps that platform's
 * message and never matches events on the other platform.
 */

/** Android event messages. */
const androidEvents = {
  maxPlacementsInvalid: 'Invalid in-app configuration: maxPlacements must be >= 1',
  requestIntervalInvalid: 'Invalid in-app configuration: placementsRequestInterval must be >= 15 minutes',
  subscribeRetryLimit: 'in-app subscribe retry limit',
  subscribeRequestDataIsNull: 'in-app subscribe request data is null',
  subscribeRequestSuccessful: 'successful request: inapp/subscribe',
  subscribeRequestFailed: 'failed request: inapp/subscribe',
  unsubscribeRequestSuccessful: 'successful request: inapp/unsubscribe',
  unsubscribeRequestFailed: 'failed request: inapp/unsubscribe',
  invalidCustomFields: 'invalid custom fields: not all values are primitives',
  statusRequestDataIsNull: 'in-app status request data is null',
  statusRequestSuccessful: 'successful request: inapp/status',
  statusRequestFailed: 'failed request: inapp/status',
  eventRetryLimit: 'in-app event retry limit',
  eventRequestDataIsNull: 'in-app event request data is null',
  smidIsNull: 'send message ID is null',
  eventRequestSuccessful: 'successful request: inapp/event',
  eventRequestFailed: 'failed request: inapp/event',
  placementsRequestDataIsNull: 'in-app placements request data is null',
  placementsRequestSuccessful: 'successful request: inapp/placements',
  placementsRequestFailed: 'failed request: inapp/placements',
  placementsLimitExceeded: 'in-app placements limit exceeded',
  inAppCanShowFailed: 'in-app was not shown because a display policy check failed:',
  invalidStaticField: 'invalid in-app static field',
  inAppStaticErrorLoad: 'error loading in-app notification static resources',
  inAppContentErrorLoad: 'error loading in-app notification content'
} as const;

/** iOS event messages. */
const iosEvents = {
  errorInAppImageLoad: 'failed to load in-app image',
  invalidStaticField: 'invalid in-app static field',
  smidIsNil: 'smid in the in-app data is null, it is impossible to send a in-app event to the server.',
  acidIsNil: 'acid in the in-app data is null, it is impossible to send a in-app event to the server.',
  inAppStatusRequestDataIsNil: 'in-app status request data is nil',
  inAppEventRequestDataIsNil: 'in-app event request data is nil',
  subscribeRequestDataIsNil: 'in-app subscribe request data is nil',
  invalidSubRequestData: 'invalid in-app subscribe request data',
  inAppUnsubscribeRequestSuccessful: 'successful request: inapp/unsubscribe',
  inAppSubscribeRequestSuccessful: 'successful request: inapp/subscribe',
  inAppStatusRequestSuccessful: 'successful request: inapp/status',
  inAppEventRequestSuccessful: 'successful request: inapp/event',
  inAppPlacementsRequestSuccessful: 'successful request: inapp/placements',
  inAppUnsubscribeRequestFailed: 'failed request: inapp/unsubscribe',
  inAppPlacementsRequestFailed: 'failed request: inapp/placements',
  inAppSubscribeRequestFailed: 'failed request: inapp/subscribe',
  inAppStatusRequestFailed: 'failed request: inapp/status',
  inAppEventRequestFailed: 'failed request: inapp/event',
  inAppStaticErrorLoad: 'error loading in-app notification static resources',
  inAppContentErrorLoad: 'error loading in-app notification content',
  maxPlacementsInvalid: 'Invalid in-app configuration: maxPlacements must be >= 1',
  requestIntervalInvalid: 'Invalid in-app configuration: placementsRequestInterval must be > 0',
  placementsLimitExceeded: 'in-app placements limit exceeded'
} as const;

/** In-App module events. */
export type InAppModuleEvents = {
  readonly [K in keyof typeof androidEvents | keyof typeof iosEvents]: string;
};

/** Event messages resolved for the current platform. */
const platformEvents: Record<string, string> =
  Platform.OS === 'ios' ? { ...iosEvents } : { ...androidEvents };

/** Module events resolved for the current platform. */
export const inAppModuleEvents: InAppModuleEvents = {
  ...androidEvents,
  ...iosEvents,
  ...platformEvents,
};
