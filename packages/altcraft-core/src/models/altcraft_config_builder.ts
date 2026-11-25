import type { AltcraftConfig, AppInfo } from './altcraft_config';

/** Options accepted by the builder constructor (core parameters only). */
export type AltcraftConfigCoreOptions = {
  /** API URL for the Altcraft backend. */
  apiUrl: string;
  /** Optional RToken for authentication. */
  rToken?: string | null;
  /** Optional application info (Firebase app ID, instance ID, version). */
  appInfo?: AppInfo | null;
  /** Optional flag to enable SDK logging. */
  enableLogging?: boolean | null;
};

/** Module configuration object contributed by a module package. */
export type ModuleConfig = Record<string, unknown>;

/**
 * Builder for `AltcraftConfig`.
 *
 * Mirrors the native `AltcraftConfiguration.Builder`: core parameters are set
 * in the constructor, while module configurations are added through extension
 * methods provided by module packages.
 *
 * ```ts
 * import { AltcraftConfigBuilder, AltcraftCore } from '@altcraft/core';
 * import '@altcraft/inapp';
 * import '@altcraft/push';
 *
 * await AltcraftCore.initialize(
 *   new AltcraftConfigBuilder({ apiUrl: 'https://your-api.altcraft.com' })
 *     .pushConfig({ providerPriority: ['android-firebase'] })
 *     .inAppConfig({ maxPlacements: 50 })
 *     .build()
 * );
 * ```
 *
 * TypeScript module augmentation exposes `pushConfig`/`inAppConfig` only when
 * the corresponding package is imported, mirroring native module linking.
 * The core module knows nothing about concrete modules: it serializes the
 * generic module map into `AltcraftConfig.moduleConfigs`.
 */
export class AltcraftConfigBuilder {
  private readonly modules: Record<string, ModuleConfig> = {};

  constructor(private readonly core: AltcraftConfigCoreOptions) {}

  /**
   * Adds a module configuration under `moduleId`.
   *
   * Intended to be called by module extensions; a later call for the same
   * `moduleId` replaces the previous configuration.
   */
  addModule(moduleId: string, config: ModuleConfig): this {
    this.modules[moduleId] = { ...config };
    return this;
  }

  /** Builds an immutable `AltcraftConfig`. */
  build(): AltcraftConfig {
    const config: AltcraftConfig = {
      apiUrl: this.core.apiUrl,
      ...(this.core.rToken != null ? { rToken: this.core.rToken } : {}),
      ...(this.core.appInfo != null ? { appInfo: this.core.appInfo } : {}),
      ...(this.core.enableLogging != null
        ? { enableLogging: this.core.enableLogging }
        : {}),
    };
    if (Object.keys(this.modules).length > 0) {
      config.moduleConfigs = JSON.stringify(this.modules);
    }
    return config;
  }
}
