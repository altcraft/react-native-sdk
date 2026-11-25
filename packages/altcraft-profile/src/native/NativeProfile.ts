import { TurboModuleRegistry, type TurboModule } from 'react-native';

/** Profile update options. */
export type UpdateProfileOptions = {
  profileFields: { [key: string]: string } | null;
  skipTriggers: boolean | null;
};

/**
 * Profile module TurboModule spec.
 *
 * Provides profile field updates.
 */
export interface Spec extends TurboModule {
  /** Updates profile fields on the server. */
  updateProfileFields(options: UpdateProfileOptions | null): void;
}

/** Native profile TurboModule instance. */
const NativeProfile = TurboModuleRegistry.getEnforcing<Spec>('Profile');
export default NativeProfile;
