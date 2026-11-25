import { Platform } from 'react-native';

/**
 * Core module events.
 *
 * Holds the messages emitted by the native SDK. Catalogs of both platforms
 * are merged: a name available on only one platform keeps that platform's
 * message and never matches events on the other platform.
 */

/** Android event messages. */
const androidEvents = {
  configIsSet: 'SDK configuration is installed',
  sdkCleared: 'SDK data has been cleared',
  notAuthenticatedError: 'User is not authenticated',
  userLogOut: 'User logged out. Anonymous session started.',
  roomMigrationError: 'Room database migration failed. The local SDK database will be recreated.',
  authenticateSuccessful: 'successful request: profile/authenticate',
  pushStatusRequestFailed: 'failed request: push/status'
} as const;

/** iOS event messages. */
const iosEvents = {
  configSet: 'SDK configuration is installed.',
  sdkCleared: 'SDK data has been cleared',
  rTokenChange: 'Role token change: SDK database data will be cleared, except for configuration data.',
  initAwait: 'waiting for SDK initialization to complete',
  userLogOut: 'User logged out. Anonymous session started',
  backgroundTaskRegister: 'SDK background task is registered',
  backgroundTaskCompleted: 'SDK background task completed',
  configIsNotSet: 'the configuration is not set',
  coreDataError: 'error in CoreData. Re-initialize the SDK.',
  errorLoadModelInCoreData: 'failed to load model from framework.',
  appGroupIsNotSet: 'App Group name was not set.',
  contextIsUnavailable: 'core data context is unavailable',
  invalidCoreDataEntityName: 'the coreData entity name is not valid',
  entityNotFoundByID: 'entity not found by ID',
  coreDataModelNotFoundInBundle: 'Core Data model was not found in any bundle',
  coreDataModelMissingEntity: 'Core Data model is missing the required entity; the model did not load',
  sdkInitWaitingExpired: 'SDK initialization timeout has expired',
  notAuthenticatedError: 'user is not authenticated',
  invalidUrlValue: 'invalid apiUrl value - empty or null.',
  invalidRTokenValue: 'invalid resource token value - resource token is empty.',
  nonJsonObject: 'non-json object has been provided',
  fieldsIsObjects: 'invalid values: not all values are primitives',
  configIsNil: 'config data is nil',
  userTagIsNil: 'userTag is null. It is impossible to identify the user',
  permissionDenied: 'notification permission denied.',
  backgroundTaskExpired: 'SDK background task expired',
  jwtIsNil: 'JWT token is nil',
  jwtParsingError: 'JWT parsing error',
  externalAuthDataIsNil: 'external auth data is nil',
  internalAuthDataIsNil: 'internal auth data is nil',
  failedCreateRequest: 'Failed to create request.',
  failedProcessingResponse: 'Failed processing the response',
  responseDataIsNull: 'response data is null',
  invalidRequestUrl: 'invalid request url',
  invalidResponseFormat: 'invalid response format',
  authenticateSuccessful: 'successful request: profile/authenticate',
  authenticateFailed: 'failed request: profile/authenticate'
} as const;

/** Core module events. */
export type CoreModuleEvents = {
  readonly [K in keyof typeof androidEvents | keyof typeof iosEvents]: string;
};

/** Event messages resolved for the current platform. */
const platformEvents: Record<string, string> =
  Platform.OS === 'ios' ? { ...iosEvents } : { ...androidEvents };

/** Module events resolved for the current platform. */
export const coreModuleEvents: CoreModuleEvents = {
  ...androidEvents,
  ...iosEvents,
  ...platformEvents,
};
