import { AltcraftConfigBuilder } from '@altcraft/core';

import type { InAppConfig } from './models/in_app_config';

/**
 * Adds the In-App module configuration to `AltcraftConfigBuilder`.
 *
 * The method is installed on the builder prototype when this package is
 * imported, mirroring native module linking. TypeScript module augmentation
 * makes it visible only when `@altcraft/inapp` is part of the program.
 */
declare module '@altcraft/core' {
  interface AltcraftConfigBuilder {
    /** Adds the In-App module configuration. */
    inAppConfig(config: InAppConfig): AltcraftConfigBuilder;
  }
}

if (
  !Object.prototype.hasOwnProperty.call(
    AltcraftConfigBuilder.prototype,
    'inAppConfig'
  )
) {
  AltcraftConfigBuilder.prototype.inAppConfig = function inAppConfig(
    config: InAppConfig
  ): AltcraftConfigBuilder {
    return this.addModule('inapp', config as Record<string, unknown>);
  };
}
