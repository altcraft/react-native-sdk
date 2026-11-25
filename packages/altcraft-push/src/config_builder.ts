import { AltcraftConfigBuilder } from '@altcraft/core';

import type { PushConfig } from './models/push_config';

/**
 * Adds the push module configuration to `AltcraftConfigBuilder`.
 *
 * The method is installed on the builder prototype when this package is
 * imported, mirroring native module linking. TypeScript module augmentation
 * makes it visible only when `@altcraft/push` is part of the program.
 */
declare module '@altcraft/core' {
  interface AltcraftConfigBuilder {
    /** Adds the push module configuration. */
    pushConfig(config: PushConfig): AltcraftConfigBuilder;
  }
}

if (
  !Object.prototype.hasOwnProperty.call(
    AltcraftConfigBuilder.prototype,
    'pushConfig'
  )
) {
  AltcraftConfigBuilder.prototype.pushConfig = function pushConfig(
    config: PushConfig
  ): AltcraftConfigBuilder {
    return this.addModule('push', config as Record<string, unknown>);
  };
}
