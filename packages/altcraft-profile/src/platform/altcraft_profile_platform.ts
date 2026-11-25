import type { UpdateProfileOptions } from '../altcraft_profile';

/**
 * Platform interface for the Altcraft profile module.
 *
 * The default implementation is [TurboModuleAltcraftProfile]; it can be
 * overridden for testing by assigning [AltcraftProfilePlatform.instance].
 */
export abstract class AltcraftProfilePlatform {
  /** The current platform interface implementation. */
  static instance: AltcraftProfilePlatform = createDefaultPlatform();

  abstract updateProfileFields(options: UpdateProfileOptions): void;
}

/** Creates the default platform implementation. */
function createDefaultPlatform(): AltcraftProfilePlatform {
  const { TurboModuleAltcraftProfile } =
    require('./turbo_module_altcraft_profile') as typeof import('./turbo_module_altcraft_profile');
  return new TurboModuleAltcraftProfile();
}
