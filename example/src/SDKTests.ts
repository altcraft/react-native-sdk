import { Platform } from 'react-native';
import AltcraftSDK, {
  type Subscription,
  type CategoryData,
} from '@altcraft/react-native-sdk';
import {
  Store,
  type SubscribeSettings,
  type SdkEventItem,
  type ConfigData,
} from './Store';

const JWT_KEY = 'JWT_KEY';
const APP_GROUP_SUITE = 'group.altcraft.react.native.example';
const MOBILE_EVENT_SID = '';
const DEFAULT_JWT = '';
const DEFAULT_API_URL = '';

export const USER_CONFIG = {
  apiUrl: DEFAULT_API_URL,
  mobileEventSid: MOBILE_EVENT_SID,
  defaultJwt: DEFAULT_JWT,
  jwtKey: JWT_KEY,
  appGroupSuite: APP_GROUP_SUITE,
};

export type { SubscribeSettings, SdkEventItem, ConfigData, CategoryData };

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForIosApnsToken(maxAttempts: number): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const token = await AltcraftSDK.getPushToken();
    if (token?.provider && token?.token && String(token.token).length > 0)
      return;
    await sleep(400);
  }
}

export async function initializationSDK(config: ConfigData): Promise<void> {
  const jwtAnon = (await Store.getJwtAnon()) || USER_CONFIG.defaultJwt;
  const jwtReg = (await Store.getJwtReg()) || USER_CONFIG.defaultJwt;
  const jwt = (await Store.getAuthStatus()) ? jwtReg : jwtAnon;
  AltcraftSDK.setUserDefaultsValue(
    USER_CONFIG.appGroupSuite,
    USER_CONFIG.jwtKey,
    jwt
  );

  if (Platform.OS === 'ios') {
    AltcraftSDK.setAppGroup(USER_CONFIG.appGroupSuite);
  }

  await AltcraftSDK.initialize({
    apiUrl: config.apiUrl,
    rToken: config.rToken,
    appInfo: {
      appID: `firebase-app-id-${Platform.OS}`,
      appIID: `firebase-instance-id-${Platform.OS}`,
      appVer: '1.0.0',
    },
    providerPriorityList:
      config.providerPriorityList.length > 0
        ? config.providerPriorityList
        : Platform.OS === 'ios'
          ? ['ios-apns']
          : ['android-firebase'],
    enableLogging: true,
    android_icon: null,
    android_pushReceiverModules: null,
    android_pushChannelName: 'Altcraft notifications',
    android_pushChannelDescription: 'Messages from Altcraft platform',
  });

  if (Platform.OS === 'android') {
    AltcraftSDK.requestNotificationPermission();
  }
}

export async function doPushSubscribe(): Promise<void> {
  if (Platform.OS === 'ios') {
    await waitForIosApnsToken(25);
  }

  const settings = await Store.getSubscribeSettings();
  AltcraftSDK.pushSubscribe(
    settings.sync ? true : null,
    Object.keys(settings.profileFields).length > 0
      ? settings.profileFields
      : null,
    Object.keys(settings.customFields).length > 0
      ? settings.customFields
      : null,
    settings.cats.length > 0 ? settings.cats : null,
    settings.replace ? true : null,
    settings.skipTriggers ? true : null
  );
}

export async function doPushSuspend(): Promise<void> {
  const settings = await Store.getSubscribeSettings();
  AltcraftSDK.pushSuspend(
    settings.sync ? true : null,
    Object.keys(settings.profileFields).length > 0
      ? settings.profileFields
      : null,
    Object.keys(settings.customFields).length > 0
      ? settings.customFields
      : null,
    settings.cats.length > 0 ? settings.cats : null,
    settings.replace ? true : null,
    settings.skipTriggers ? true : null
  );
}

export async function doPushUnSubscribe(): Promise<void> {
  const settings = await Store.getSubscribeSettings();
  AltcraftSDK.pushUnSubscribe(
    settings.sync ? true : null,
    Object.keys(settings.profileFields).length > 0
      ? settings.profileFields
      : null,
    Object.keys(settings.customFields).length > 0
      ? settings.customFields
      : null,
    settings.cats.length > 0 ? settings.cats : null,
    settings.replace ? true : null,
    settings.skipTriggers ? true : null
  );
}

export async function doLogin(): Promise<void> {
  await Store.saveAuthStatus(true);
  AltcraftSDK.unlockInitialOperationsInThisSession();
  const res = await AltcraftSDK.unSuspendPushSubscription();
  if (res?.httpCode === 200 && !res.response?.profile?.subscription) {
    await doPushSubscribe();
  }
}

export async function doLogout(): Promise<void> {
  await Store.saveAuthStatus(false);
  AltcraftSDK.unlockInitialOperationsInThisSession();
  await AltcraftSDK.unSuspendPushSubscription();
}

export async function doGetProfileStatus(): Promise<Record<
  string,
  unknown
> | null> {
  const res = await AltcraftSDK.getStatusForCurrentSubscription();
  if (res?.response?.profile) {
    await Store.saveProfileData(
      res.response.profile as Record<string, unknown>
    );
    return res.response.profile as Record<string, unknown>;
  }
  return null;
}

export async function doForcedTokenUpdate(): Promise<void> {
  await AltcraftSDK.forcedTokenUpdate();
}

export async function doDeleteToken(provider: string): Promise<void> {
  await AltcraftSDK.deleteDeviceToken(provider);
}

export async function doChangePriority(list: string[]): Promise<void> {
  await AltcraftSDK.changePushProviderPriorityList(list);
  await Store.saveProviderList(list);
}

export async function doClear(): Promise<void> {
  await AltcraftSDK.clear();
}

export async function doSendMobileEvent(
  eventName: string,
  sendMessageId: string | null,
  payload: Record<string, unknown> | null,
  matching: Record<string, unknown> | null,
  matchingType: string | null,
  profileFields: Record<string, unknown> | null,
  subscription: Subscription | null,
  utm: Record<string, unknown> | null
): Promise<void> {
  AltcraftSDK.mobileEvent(
    USER_CONFIG.mobileEventSid,
    eventName,
    sendMessageId,
    payload,
    matching,
    matchingType,
    profileFields,
    subscription,
    utm as any
  );
}

export async function doUpdateProfile(
  fields: Record<string, unknown> | null,
  skipTriggers: boolean | null
): Promise<void> {
  AltcraftSDK.updateProfileFields(fields, skipTriggers);
}

export function doTakePush(message: Record<string, string>): void {
  AltcraftSDK.takePush(message);
}

export function doIsAltcraftPush(message: Record<string, string>): boolean {
  return AltcraftSDK.isAltcraftPush(message);
}
