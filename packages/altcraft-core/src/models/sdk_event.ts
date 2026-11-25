/** SDK event emitted from the native SDK. */
export type SdkEvent = {
  /** Function name that triggered the event. */
  function: string;
  /** HTTP status code (if applicable). */
  code: number | null;
  /** Human-readable message. */
  message: string;
  /** Event type. */
  type: 'event' | 'error' | 'retryError';
  /** Optional event value payload. */
  value?: Record<string, unknown> | null;
  /** Timestamp string from the native SDK (yyyy-MM-dd HH:mm:ss.SSS). */
  timestamp?: string | null;
};

/** Creates an SdkEvent from a native map. */
export function sdkEventFromNative(value: unknown): SdkEvent | null {
  if (value == null || typeof value !== 'object') return null;
  const map = value as Record<string, unknown>;
  let code: number | null = null;
  if (typeof map.code === 'number') code = Math.trunc(map.code);
  else if (map.code != null) {
    const parsed = parseInt(String(map.code), 10);
    if (!Number.isNaN(parsed)) code = parsed;
  }
  const type = map.type === 'error' || map.type === 'retryError'
    ? (map.type as SdkEvent['type'])
    : 'event';
  return {
    function: map.function != null ? String(map.function) : '',
    code,
    message: map.message != null ? String(map.message) : '',
    type,
    value:
      map.value != null && typeof map.value === 'object'
        ? (map.value as Record<string, unknown>)
        : null,
    timestamp: map.timestamp != null ? String(map.timestamp) : null,
  };
}
