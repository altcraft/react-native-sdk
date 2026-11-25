import AsyncStorage from '@react-native-community/async-storage';
import type { CategoryData } from '@altcraft/core';

// Pre-filled defaults (match AndroidModules example)
export const kDefaultApiUrl: string | null = null;
export const kDefaultJwtAnon: string | null = null;
export const kDefaultJwtReg: string | null = null;
export const kDefaultRToken = '';
export const kMobileEventSid = '';
export const kJwtKey = 'JWT_KEY';
export const kAppGroupSuite = 'group.altcraft.react.native.example';

export const kAppId = 'AltcraftMobile';
export const kAppIid = '1.0.0';
export const kAppVer = '1.0.0';
export const kPushIconName = 'ic_altcraft_push_icon';

export const kEmptyValueUi = '........';
export const kExampleTitle = 'Altcraft';
export const kExampleBody = 'Welcome to the Altcraft Notification Builder!';

export const kFcmProvider = 'android-firebase';
export const kHmsProvider = 'android-huawei';
export const kRustoreProvider = 'android-rustore';
export const kApnsProvider = 'ios-apns';

export const kSubscribed = 'subscribed';
export const kUnsubscribed = 'unsubscribed';
export const kSuspended = 'suspended';

/** Returns nullOrEmpty → null, otherwise trimmed value. */
function parseRToken(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

export class ConfigData {
  apiUrl: string | null;
  rToken: string | null;
  providerPriorityList: string[];

  constructor(
    apiUrl: string | null = kDefaultApiUrl,
    rToken: string | null = null,
    providerPriorityList: string[] = []
  ) {
    this.apiUrl = apiUrl;
    this.rToken = rToken;
    this.providerPriorityList = providerPriorityList;
  }

  /** Returns the effective rToken: user-set value, or kDefaultRToken if non-empty, otherwise null. */
  get effectiveRToken(): string | null {
    if (this.rToken != null && this.rToken.length > 0) return this.rToken;
    return kDefaultRToken.length > 0 ? kDefaultRToken : null;
  }

  toJson(): Record<string, unknown> {
    return {
      apiUrl: this.apiUrl,
      rToken: this.rToken,
      providerPriorityList: this.providerPriorityList,
    };
  }

  static fromJson(json: Record<string, unknown>): ConfigData {
    const apiUrl = json['apiUrl'];
    return new ConfigData(
      typeof apiUrl === 'string' ? apiUrl : kDefaultApiUrl,
      parseRToken(json['rToken']),
      Array.isArray(json['providerPriorityList'])
        ? (json['providerPriorityList'] as string[])
        : []
    );
  }
}

export class NotificationData {
  title: string;
  body: string;
  smallImageUrl: string | null;
  largeImageUrl: string | null;
  buttons: string[];

  constructor(
    title: string = kExampleTitle,
    body: string = kExampleBody,
    smallImageUrl: string | null = null,
    largeImageUrl: string | null = null,
    buttons: string[] = []
  ) {
    this.title = title;
    this.body = body;
    this.smallImageUrl = smallImageUrl;
    this.largeImageUrl = largeImageUrl;
    this.buttons = buttons;
  }

  toJson(): Record<string, unknown> {
    return {
      title: this.title,
      body: this.body,
      smallImageUrl: this.smallImageUrl,
      largeImageUrl: this.largeImageUrl,
      buttons: this.buttons,
    };
  }

  static fromJson(json: Record<string, unknown>): NotificationData {
    return new NotificationData(
      (json['title'] as string | undefined) ?? kExampleTitle,
      (json['body'] as string | undefined) ?? kExampleBody,
      (json['smallImageUrl'] as string | undefined) ?? null,
      (json['largeImageUrl'] as string | undefined) ?? null,
      Array.isArray(json['buttons']) ? (json['buttons'] as string[]) : []
    );
  }
}

export class SubscribeSettings {
  sync: boolean;
  replace: boolean;
  skipTriggers: boolean;
  customFields: Record<string, string>;
  profileFields: Record<string, string>;
  cats: CategoryData[];

  constructor(
    sync: boolean = true,
    replace: boolean = false,
    skipTriggers: boolean = false,
    customFields: Record<string, string> = {},
    profileFields: Record<string, string> = {},
    cats: CategoryData[] = []
  ) {
    this.sync = sync;
    this.replace = replace;
    this.skipTriggers = skipTriggers;
    this.customFields = customFields;
    this.profileFields = profileFields;
    this.cats = cats;
  }

  toJson(): Record<string, unknown> {
    return {
      sync: this.sync,
      replace: this.replace,
      skipTriggers: this.skipTriggers,
      customFields: this.customFields,
      profileFields: this.profileFields,
      cats: this.cats,
    };
  }

  static fromJson(json: Record<string, unknown>): SubscribeSettings {
    const rawCats = json['cats'];
    const cats: CategoryData[] = Array.isArray(rawCats)
      ? (rawCats as CategoryData[]).map((c) => ({
          name: c?.name ?? null,
          title: c?.title ?? null,
          steady: c?.steady ?? null,
          active: c?.active ?? null,
        }))
      : [];
    const customFields = json['customFields'];
    const profileFields = json['profileFields'];
    return new SubscribeSettings(
      (json['sync'] as boolean | undefined) ?? true,
      (json['replace'] as boolean | undefined) ?? false,
      (json['skipTriggers'] as boolean | undefined) ?? false,
      customFields != null && typeof customFields === 'object'
        ? ({ ...(customFields as Record<string, string>) })
        : {},
      profileFields != null && typeof profileFields === 'object'
        ? ({ ...(profileFields as Record<string, string>) })
        : {},
      cats
    );
  }
}

/** Persistent key-value store on top of AsyncStorage. */
export class Store {
  private static _instance: Store | null = null;

  static get instance(): Store {
    if (Store._instance === null) Store._instance = new Store();
    return Store._instance;
  }

  private constructor() {}

  private async getString(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  }

  private async setString(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  }

  // Config
  async getConfig(): Promise<ConfigData> {
    const raw = (await this.getString('config')) ?? '{}';
    try {
      return ConfigData.fromJson(JSON.parse(raw));
    } catch {
      return new ConfigData();
    }
  }

  async saveConfig(config: ConfigData): Promise<void> {
    await this.setString('config', JSON.stringify(config.toJson()));
  }

  // Token
  async saveTokenData(provider: string, token: string): Promise<void> {
    await this.setString('token_provider', provider);
    await this.setString('token_value', token);
  }

  async getToken(): Promise<string> {
    return (await this.getString('token_value')) ?? '';
  }

  async getProvider(): Promise<string> {
    return (await this.getString('token_provider')) ?? '';
  }

  async getTokenUpdateTime(): Promise<string | null> {
    return this.getString('token_update_time');
  }

  async saveTokenUpdateTime(time: string): Promise<void> {
    await this.setString('token_update_time', time);
  }

  // JWT
  async getJwtAnon(): Promise<string | null> {
    return (await this.getString('jwt_anon')) ?? kDefaultJwtAnon;
  }

  async saveJwtAnon(jwt: string): Promise<void> {
    await this.setString('jwt_anon', jwt);
  }

  async getJwtReg(): Promise<string | null> {
    return (await this.getString('jwt_reg')) ?? kDefaultJwtReg;
  }

  async saveJwtReg(jwt: string): Promise<void> {
    await this.setString('jwt_reg', jwt);
  }

  async removeJwts(): Promise<void> {
    await AsyncStorage.removeItem('jwt_anon');
    await AsyncStorage.removeItem('jwt_reg');
  }

  async getAuthStatus(): Promise<boolean> {
    return (await this.getString('auth_status')) === 'true';
  }

  async saveAuthStatus(status: boolean): Promise<void> {
    await this.setString('auth_status', status ? 'true' : 'false');
  }

  async getExternalAuthStatus(): Promise<boolean> {
    return (await this.getString('external_auth_status')) === 'true';
  }

  async saveExternalAuthStatus(status: boolean): Promise<void> {
    await this.setString('external_auth_status', status ? 'true' : 'false');
  }

  // Subscription statuses
  async getAppStatus(): Promise<string> {
    return (await this.getString('app_status')) ?? kUnsubscribed;
  }

  async saveAppStatus(status: string): Promise<void> {
    await this.setString('app_status', status);
  }

  async getInAppStatus(): Promise<string> {
    return (await this.getString('inapp_status')) ?? kUnsubscribed;
  }

  async saveInAppStatus(status: string): Promise<void> {
    await this.setString('inapp_status', status);
  }

  // Subscribe settings
  async getSubscribeSettings(): Promise<SubscribeSettings> {
    const raw = (await this.getString('subscribe_settings')) ?? '{}';
    try {
      return SubscribeSettings.fromJson(JSON.parse(raw));
    } catch {
      return new SubscribeSettings();
    }
  }

  async saveSubscribeSettings(settings: SubscribeSettings): Promise<void> {
    await this.setString(
      'subscribe_settings',
      JSON.stringify(settings.toJson())
    );
  }

  // Notification data (Example screen)
  async getNotificationData(): Promise<NotificationData> {
    const raw = (await this.getString('notification_data')) ?? '{}';
    try {
      return NotificationData.fromJson(JSON.parse(raw));
    } catch {
      return new NotificationData();
    }
  }

  async saveNotificationData(data: NotificationData): Promise<void> {
    await this.setString(
      'notification_data',
      JSON.stringify(data.toJson())
    );
  }

  // Clear
  async clearAll(): Promise<void> {
    await AsyncStorage.clear();
  }
}
