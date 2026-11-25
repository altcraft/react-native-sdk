import { Platform } from 'react-native';

/**
 * Push module events.
 *
 * Holds the messages emitted by the native SDK. Catalogs of both platforms
 * are merged: a name available on only one platform keeps that platform's
 * message and never matches events on the other platform.
 */

/** Android event messages. */
const androidEvents = {
  invalidProvider: 'Invalid push configuration: unsupported push provider. Available providers: android-firebase, android-huawei, android-rustore.',
  configIsNull: 'push configuration is null',
  invalidCustomFields: 'invalid custom fields: not all values are primitives',
  eventRetryLimit: 'push event retry limit',
  eventRequestDataIsNull: 'push event request data is null',
  eventRequestSuccessful: 'successful request: event/push',
  eventRequestFailed: 'failed request: event/push',
  pushUidIsNull: 'push uid is null',
  subscribeRetryLimit: 'push subscribe retry limit',
  subscribeRequestDataIsNull: 'push subscribe request data is null',
  subscribeRequestSuccessful: 'successful request: push/subscribe',
  subscribeRequestFailed: 'failed request: push/subscribe',
  suspendRequestSuccessful: 'successful request: push/suspend',
  suspendRequestFailed: 'failed request: push/suspend',
  unsubscribeRequestSuccessful: 'successful request: push/unsubscribe',
  unsubscribeRequestFailed: 'failed request: push/unsubscribe',
  tokenUpdateRequestDataIsNull: 'token update request data is null',
  tokenUpdateRequestSuccessful: 'successful request: push/update',
  tokenUpdateRequestFailed: 'failed request: push/update',
  pushTokenIsNull: 'push token is null',
  notUpdated: 'push token not updated',
  pushProviderSet: 'push provider set -',
  invalidPushProvider: 'Invalid push provider. Available providers: android-firebase, android-huawei, android-rustore.',
  statusRequestDataIsNull: 'subscription status request data is null',
  statusRequestSuccess: 'successful request: push/status',
  statusRequestFailed: 'failed request: push/status',
  unSuspendRequestDataIsNull: 'unsuspend request data is null',
  unSuspendRequestSuccessful: 'successful request: push/unsuspend',
  unSuspendRequestFailed: 'failed request: push/unsuspend',
  pushDataIsNull: 'push data is null',
  notificationErr: 'notification error',
  channelNotCreated: 'notification channel not created',
  pushPermissionDenied: 'notification permission denied',
  pushIsPosted: 'push notification is posted',
  acPush: 'Altcraft push notification received',
  notAcPush: 'received a notification unrelated to the Altcraft Platform',
  duplicatePushMessage: 'duplicate push message: processing and display skipped',
  receiverRedefined: 'push receiver redefined',
  errorImgLoad: 'error loading push image',
  successImgLoad: 'push image loaded successfully'
} as const;

/** iOS event messages. */
const iosEvents = {
  pushProviderSet: 'push provider set: ',
  pushReceive: 'received Altcraft push notification.',
  pushIsPosted: 'push is posted.',
  duplicatePushMessage: 'duplicate push message, uid: ',
  pushTokenUpdateAwait: 'waiting for push token update to complete',
  apnsIsNotUpdated: 'forcing a push token update is not possible: the operation is not supported for APNs.',
  errorHandleUserInfo: 'invalid userInfo format',
  uidIsNil: 'uid in the push data is null, it is impossible to send a push event to the server.',
  errorMediaDownload: 'could not download image data from URL.',
  errorMediaKeyMissing: '\'media\' key is missing or URL string is invalid.',
  errorButtonsKeyMissing: '\'buttons\' key is missing or is invalid.',
  invalidButtonIdentifier: 'invalid button identifier. See event value',
  outOfRangeForIdentifier: 'out of range for identifier. See event value',
  unknownButtonIdentifier: 'unknown button identifier. See event value',
  invalidPushProviders: 'invalid provider. Available - ios-apns, ios-firebase, ios-huawei.',
  invalidPushProvider: 'invalid provider.',
  pushTokenIsNil: 'current push token is nil',
  subscribeRequestDataIsNil: 'subscribe request data is nil',
  updateRequestDataIsNil: 'update request data is nil',
  pushEventRequestDataIsNil: 'push event request data is nil',
  unsuspendRequestDataIsNil: 'unsuspend request data is nil',
  pushStatusRequestDataIsNil: 'push status request data is nil',
  invalidSubRequestData: 'invalid push subscribe request data',
  invalidPushEventRequestData: 'invalid push event request data',
  pushConfigurationSaveFailed: 'failed to save the push configuration to the local database',
  pushConfigurationClearFailed: 'failed to clear the push configuration from the local database',
  pushUnsubscribeRequestSuccessful: 'successful request: push/unsubscribe',
  pushSubscribeRequestSuccessful: 'successful request: push/subscribe',
  pushSuspendRequestSuccessful: 'successful request: push/suspend',
  pushStatusRequestSuccessful: 'successful request: push/status',
  tokenUpdateRequestSuccessful: 'successful request: push/update',
  pushEventRequestSuccessful: 'successful request: event/push',
  unsuspendRequestSuccessful: 'successful request: push/unsuspend',
  pushUnsubscribeRequestFailed: 'failed request: push/unsubscribe',
  pushSubscribeRequestFailed: 'failed request: push/subscribe',
  pushSuspendRequestFailed: 'failed request: push/suspend',
  pushStatusRequestFailed: 'failed request: push/status',
  tokenUpdateRequestFailed: 'failed request: push/update',
  pushEventRequestFailed: 'failed request: event/push',
  unsuspendRequestFailed: 'failed request: push/unsuspend'
} as const;

/** Push module events. */
export type PushModuleEvents = {
  readonly [K in keyof typeof androidEvents | keyof typeof iosEvents]: string;
};

/** Event messages resolved for the current platform. */
const platformEvents: Record<string, string> =
  Platform.OS === 'ios' ? { ...iosEvents } : { ...androidEvents };

/** Module events resolved for the current platform. */
export const pushModuleEvents: PushModuleEvents = {
  ...androidEvents,
  ...iosEvents,
  ...platformEvents,
};
