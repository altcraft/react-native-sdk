/** Push token data returned from the SDK. */
export type TokenData = {
  /** Push provider identifier (e.g. 'android-firebase', 'ios-apns'). */
  provider: string;
  /** Push token value. */
  token: string;
};

/** Creates TokenData from a native map. */
export function tokenDataFromNative(value: unknown): TokenData | null {
  if (value == null || typeof value !== 'object') return null;
  const map = value as Record<string, unknown>;
  return {
    provider: map.provider != null ? String(map.provider) : '',
    token: map.token != null ? String(map.token) : '',
  };
}

/** Converts TokenData to a plain object for the native bridge. */
export function tokenDataToNative(tokenData: TokenData): Record<string, string> {
  return { provider: tokenData.provider, token: tokenData.token };
}
