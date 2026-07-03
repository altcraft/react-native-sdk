import AsyncStorage from '@react-native-community/async-storage';
import { USER_CONFIG } from './SDKTests';

export type SubscribeSettings = {
  sync: boolean;
  replace: boolean;
  skipTriggers: boolean;
  customFields: Record<string, string>;
  profileFields: Record<string, string>;
  cats: CategoryData[];
};

export type CategoryData = {
  name?: string;
  title?: string;
  steady?: boolean;
  active?: boolean;
};

export type ConfigData = {
  apiUrl: string;
  rToken: string | null;
  providerPriorityList: string[];
};

export type SdkEventItem = {
  function: string;
  code: number | null;
  message: string;
  type: 'event' | 'error' | 'retryError';
  value?: Record<string, unknown> | null;
  timestamp: number;
};

const KEYS = {
  CONFIG: 'ac_config',
  STATUS: 'ac_status',
  SUBSCRIBE_SETTINGS: 'ac_subscribe_settings',
  JWT_ANON: 'ac_jwt_anon',
  JWT_REG: 'ac_jwt_reg',
  AUTH_STATUS: 'ac_auth_status',
  TOKEN: 'ac_token',
  PROVIDER: 'ac_provider',
  PROVIDER_LIST: 'ac_provider_list',
  PROFILE_DATA: 'ac_profile_data',
  EVENT_LIST: 'ac_event_list',
};

async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const s = await AsyncStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
}

async function saveJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const Store = {
  // Config
  async getConfig(): Promise<ConfigData> {
    return loadJson(KEYS.CONFIG, {
      apiUrl: USER_CONFIG.apiUrl,
      rToken: null,
      providerPriorityList: [],
    });
  },
  async saveConfig(config: ConfigData): Promise<void> {
    await saveJson(KEYS.CONFIG, config);
  },

  // Subscription status
  async getStatus(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.STATUS);
  },
  async saveStatus(status: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.STATUS, status);
  },

  // Subscribe settings
  async getSubscribeSettings(): Promise<SubscribeSettings> {
    return loadJson(KEYS.SUBSCRIBE_SETTINGS, {
      sync: true,
      replace: false,
      skipTriggers: false,
      customFields: {},
      profileFields: {},
      cats: [],
    });
  },
  async saveSubscribeSettings(settings: SubscribeSettings): Promise<void> {
    await saveJson(KEYS.SUBSCRIBE_SETTINGS, settings);
  },

  // JWT
  async getJwtAnon(): Promise<string> {
    const v = await AsyncStorage.getItem(KEYS.JWT_ANON);
    return v || '';
  },
  async saveJwtAnon(jwt: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.JWT_ANON, jwt);
  },
  async getJwtReg(): Promise<string> {
    const v = await AsyncStorage.getItem(KEYS.JWT_REG);
    return v || '';
  },
  async saveJwtReg(jwt: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.JWT_REG, jwt);
  },

  // Auth
  async getAuthStatus(): Promise<boolean> {
    const v = await AsyncStorage.getItem(KEYS.AUTH_STATUS);
    return v === 'true';
  },
  async saveAuthStatus(authed: boolean): Promise<void> {
    await AsyncStorage.setItem(KEYS.AUTH_STATUS, String(authed));
  },

  // Token
  async saveTokenData(provider: string, token: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.PROVIDER, provider);
    await AsyncStorage.setItem(KEYS.TOKEN, token);
  },
  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.TOKEN);
  },
  async getProvider(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.PROVIDER);
  },
  async saveProviderList(list: string[]): Promise<void> {
    await saveJson(KEYS.PROVIDER_LIST, list);
  },
  async getProviderList(): Promise<string[]> {
    return loadJson(KEYS.PROVIDER_LIST, []);
  },

  // Profile
  async saveProfileData(data: Record<string, unknown> | null): Promise<void> {
    await saveJson(KEYS.PROFILE_DATA, data);
  },
  async getProfileData(): Promise<Record<string, unknown> | null> {
    return loadJson(KEYS.PROFILE_DATA, null);
  },

  // Events
  async getEventList(): Promise<SdkEventItem[]> {
    return loadJson(KEYS.EVENT_LIST, []);
  },
  async saveEventList(events: SdkEventItem[]): Promise<void> {
    await saveJson(KEYS.EVENT_LIST, events);
  },

  // Clear all
  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  },
};
