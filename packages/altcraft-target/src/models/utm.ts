/** UTM tags for attribution tracking. */
export type UTM = {
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  content?: string | null;
  keyword?: string | null;
  temp?: string | null;
};

/** Converts UTM tags to a plain object for the native bridge. */
export function utmToNative(utm: UTM): Record<string, unknown> {
  return {
    source: utm.source ?? null,
    medium: utm.medium ?? null,
    campaign: utm.campaign ?? null,
    content: utm.content ?? null,
    keyword: utm.keyword ?? null,
    temp: utm.temp ?? null,
  };
}

/** Creates UTM from a decoded native object. */
export function utmFromNative(value: unknown): UTM | null {
  if (value == null || typeof value !== 'object') return null;
  const map = value as Record<string, unknown>;
  const str = (v: unknown) => (v != null ? String(v) : null);
  return {
    source: str(map.source),
    medium: str(map.medium),
    campaign: str(map.campaign),
    content: str(map.content),
    keyword: str(map.keyword),
    temp: str(map.temp),
  };
}
