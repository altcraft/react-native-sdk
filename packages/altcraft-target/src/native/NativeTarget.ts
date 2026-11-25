import { TurboModuleRegistry, type TurboModule } from 'react-native';

/** UTM parameters for event attribution. */
export type UTM = {
  campaign?: string | null;
  content?: string | null;
  keyword?: string | null;
  medium?: string | null;
  source?: string | null;
  temp?: string | null;
};

/** Mobile event options. */
export type MobileEventOptions = {
  sid: string;
  eventName: string;
  sendMessageId: string | null;
  payload: { [key: string]: string } | null;
  matching: { [key: string]: string } | null;
  matchingType: string | null;
  profileFields: { [key: string]: string } | null;
  subscription: { [key: string]: string } | null;
  utm: UTM | null;
};

/**
 * Target module TurboModule spec.
 *
 * Provides mobile event tracking with payload, matching, subscription,
 * and UTM data.
 */
export interface Spec extends TurboModule {
  /** Sends a target event to the server. */
  sendTarget(options: MobileEventOptions | null): void;
}

/** Native target TurboModule instance. */
const NativeTarget = TurboModuleRegistry.getEnforcing<Spec>('Target');
export default NativeTarget;
