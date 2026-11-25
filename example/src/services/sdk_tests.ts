import { Platform } from 'react-native';
import {
  AltcraftConfigBuilder,
  AltcraftCore,
  type CategoryData,
  type ResponseWithHttpCode,
} from '@altcraft/core';
import { AltcraftPush } from '@altcraft/push';
import { AltcraftInApp } from '@altcraft/inapp';
import { AltcraftTarget } from '@altcraft/target';
import { AppState } from './app_state';
import {
  Store,
  kAppGroupSuite,
  kAppId,
  kAppIid,
  kAppVer,
  kJwtKey,
  kPushIconName,
  kUnsubscribed,
  ConfigData,
  type SubscribeSettings,
} from './store';

/** Indirection so SdkTests can refresh token UI without a widget context. */
export class AppStateHolder {
  private static updateTokenUi: (() => Promise<void>) | null = null;

  static bind(fn: () => Promise<void>): void {
    AppStateHolder.updateTokenUi = fn;
  }

  static async update(): Promise<void> {
    await AppStateHolder.updateTokenUi?.();
  }
}

export class SdkTests {
  static async initializationSDK(config: ConfigData): Promise<void> {
    const apiUrl = config.apiUrl;
    if (apiUrl == null || apiUrl.trim().length === 0) {
      return;
    }

    // Resolve JWT (anon or reg)
    const jwtAnon = await Store.instance.getJwtAnon();
    const jwtReg = await Store.instance.getJwtReg();
    const externalAuth = await Store.instance.getExternalAuthStatus();
    const jwt = externalAuth ? jwtReg : jwtAnon;

    // Set JWT via UserDefaults for iOS compatibility
    await AltcraftCore.setUserDefaultsValue(kAppGroupSuite, kJwtKey, jwt);

    if (Platform.OS === 'ios') {
      await AltcraftCore.setAppGroup(kAppGroupSuite);
    }

    await AltcraftCore.initialize(
      new AltcraftConfigBuilder({
        apiUrl: apiUrl,
        rToken: config.effectiveRToken,
        appInfo: {
          appID: kAppId,
          appIID: kAppIid,
          appVer: kAppVer,
        },
        enableLogging: true,
      })
        .pushConfig({
          providerPriority: config.providerPriorityList,
          iconName: kPushIconName,
        })
        .inAppConfig({})
        .build()
    );

    // The JWT provider is required on both platforms: the SDK extracts the
    // rtoken from it for authentication and In-App RToken display checks.
    await AltcraftCore.setJwtProvider(async () => {
      const auth = await Store.instance.getExternalAuthStatus();
      return auth
        ? await Store.instance.getJwtReg()
        : await Store.instance.getJwtAnon();
    });

    if (Platform.OS === 'android') {
      await AltcraftPush.requestNotificationPermission();
      await AppState.instance.syncAuthFromSdk();
    }

    // Setting the initial screen fires the In-App openPage trigger on both
    // platforms, so placements matching the home screen show at startup.
    await AltcraftInApp.setScreen('home');

    // iOS parity for placements freshness: Android requests placements on
    // module init; the iOS SDK only processes pending operations there, so
    // the example requests them explicitly (userReq bypasses the auto-request
    // interval). Triggers scheduled before the data arrives are parked by the
    // SDK's placements readiness gate and released once it completes.
    void AltcraftInApp.getPlacements();

    // Default In-App show animation: the view slides up while fading in.
    // Mirrors the native SDK animation hooks on the hosting app side.
    AltcraftInApp.setAnimation({
      default: {
        durationMs: 400,
        easing: 'easeOut',
        alphaFrom: 0,
        alphaTo: 1,
        translateYFrom: 120,
        translateYTo: 0,
      },
    });

    const savedStatus = await Store.instance.getAppStatus();
    if (savedStatus === kUnsubscribed) {
      void AltcraftPush.getStatusForCurrentSubscription();
    }
  }

  /** Mirrors SDKFunctions.Subscribe.subscribe */
  static async doPushSubscribe(): Promise<void> {
    const ss = await Store.instance.getSubscribeSettings();
    await AltcraftPush.pushSubscribe({
      sync: ss.sync !== false,
      replace: ss.replace === true,
      skipTriggers: ss.skipTriggers === true,
      customFields: { ...ss.customFields },
      profileFields: { ...ss.profileFields },
      cats: ss.cats,
    });
  }

  /** Mirrors SDKFunctions.Subscribe.unSubscribe */
  static async doPushUnSubscribe(): Promise<void> {
    const ss = await Store.instance.getSubscribeSettings();
    await AltcraftPush.pushUnSubscribe({
      sync: ss.sync !== false,
      replace: ss.replace === true,
      skipTriggers: ss.skipTriggers === true,
      customFields: { ...ss.customFields },
      profileFields: { ...ss.profileFields },
    });
  }

  static async doInAppSubscribe(): Promise<void> {
    const ss = await Store.instance.getSubscribeSettings();
    await AltcraftInApp.inAppSubscribe({
      sync: ss.sync !== false,
      replace: ss.replace === true,
      skipTriggers: ss.skipTriggers === true,
      customFields: { ...ss.customFields },
      profileFields: { ...ss.profileFields },
      cats: ss.cats,
    });
  }

  static async doInAppUnsubscribe(): Promise<void> {
    const ss = await Store.instance.getSubscribeSettings();
    await AltcraftInApp.inAppUnsubscribe({
      sync: ss.sync !== false,
      replace: ss.replace === true,
      skipTriggers: ss.skipTriggers === true,
      customFields: { ...ss.customFields },
      profileFields: { ...ss.profileFields },
    });
  }

  /** Mirrors SDKFunctions.Login.unSuspend flow. */
  static async doLogin(): Promise<void> {
    await SdkTests.unSuspend(true);
  }

  static async doLogout(): Promise<void> {
    await SdkTests.unSuspend(false);
  }

  private static async unSuspend(logIn: boolean): Promise<void> {
    const ss = await Store.instance.getSubscribeSettings();
    await Store.instance.saveExternalAuthStatus(logIn);

    const response: ResponseWithHttpCode | null =
      await AltcraftPush.unSuspendPushSubscription();
    const profile = response?.response?.['profile'] as
      | Record<string, unknown>
      | undefined;
    const subscription = profile?.['subscription'];
    if (response?.httpCode === 200 && subscription == null) {
      await AltcraftPush.pushSubscribe({
        sync: true,
        replace: ss.replace !== true,
        skipTriggers: ss.skipTriggers !== true,
        customFields: { ...ss.customFields },
        profileFields: { ...ss.profileFields },
      });
    }
  }

  /** Mirrors SDKFunctions.updateProvider */
  static async doUpdateProvider(providerList: string[]): Promise<void> {
    await AltcraftPush.changePushProviderPriorityList(providerList);

    const currentConfig = await Store.instance.getConfig();
    await Store.instance.saveConfig(
      new ConfigData(
        currentConfig.apiUrl,
        currentConfig.rToken,
        providerList
      )
    );
    await AppStateHolder.update();
  }

  static async doGetProfileStatus(): Promise<Record<string, unknown> | null> {
    const response = await AltcraftPush.getStatusForCurrentSubscription();
    if (response == null) return null;
    return {
      http_code: response.httpCode,
      response: response.response,
    };
  }

  static async doForcedTokenUpdate(): Promise<void> {
    await AltcraftPush.forcedTokenUpdate();
  }

  static async doClear(): Promise<void> {
    await AltcraftCore.clear();
  }

  static async doSendMobileEvent(sid: string, name: string): Promise<void> {
    await AltcraftTarget.sendTarget({
      sid,
      eventName: name,
      sendMessageId: null,
      payload: null,
      matching: null,
      matchingType: null,
      profileFields: null,
      subscription: null,
      utm: null,
    });
  }
}

export type { SubscribeSettings, CategoryData };
