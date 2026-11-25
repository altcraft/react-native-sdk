import type { MobileEventOptions } from '../altcraft_target';

/**
 * Platform interface for the Altcraft target module.
 *
 * The default implementation is [TurboModuleAltcraftTarget]; it can be
 * overridden for testing by assigning [AltcraftTargetPlatform.instance].
 */
export abstract class AltcraftTargetPlatform {
  /** The current platform interface implementation. */
  static instance: AltcraftTargetPlatform = createDefaultPlatform();

  abstract sendTarget(options: MobileEventOptions): void;
}

/** Creates the default platform implementation. */
function createDefaultPlatform(): AltcraftTargetPlatform {
  const { TurboModuleAltcraftTarget } =
    require('./turbo_module_altcraft_target') as typeof import('./turbo_module_altcraft_target');
  return new TurboModuleAltcraftTarget();
}

export type { MobileEventOptions };
