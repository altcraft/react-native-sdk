/**
 * Method and event channel names used by the Altcraft React Native SDK modules.
 *
 * Each SDK module communicates through its own TurboModule. The umbrella
 * [sdk] module handles full SDK initialization. Core also exposes a shared
 * [events] stream for native SDK events.
 */
export const AltcraftChannels = {
  /** Umbrella module: full SDK initialization (push/in-app options included). */
  sdk: 'Sdk',

  /** Core module: initialization, events, authentication, storage. */
  core: 'Core',

  /** Push module. */
  push: 'Push',

  /** In-App module. */
  inApp: 'InApp',

  /** Target module. */
  target: 'Target',

  /** Profile module. */
  profile: 'Profile',

  /** Shared native SDK events event name (owned by the core module). */
  events: 'AltcraftSdkEvent',

  /** Native-to-JS JWT provider request event name. */
  jwtRequest: 'altcraftJwtRequest',

  /** In-App JSON content delivery event name. */
  inAppJsonContent: 'AltcraftInAppJsonContent',
} as const;
