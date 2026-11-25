/**
 * Installs module configuration extensions on `AltcraftConfigBuilder`.
 *
 * React Native uses inline requires, so named imports are evaluated lazily.
 * Module packages register their builder extensions (`pushConfig`,
 * `inAppConfig`) as an import side effect; importing them here eagerly ensures
 * the extensions exist before the SDK is initialized.
 */
import '@altcraft/push';
import '@altcraft/inapp';
