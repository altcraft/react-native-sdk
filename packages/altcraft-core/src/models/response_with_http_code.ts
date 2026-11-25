/** Safely converts a dynamic value to int. */
function asInt(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Math.trunc(value);
  const parsed = parseInt(String(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/** HTTP response with status code from the Altcraft API. */
export type ResponseWithHttpCode = {
  /** HTTP status code. */
  httpCode: number;
  /** Response body. */
  response: Record<string, unknown> | null;
};

/** Creates a ResponseWithHttpCode from a native map. */
export function responseWithHttpCodeFromNative(
  value: unknown
): ResponseWithHttpCode | null {
  if (value == null || typeof value !== 'object') return null;
  const map = value as Record<string, unknown>;
  const raw = map.http_code ?? map.httpCode;
  const resp = map.response;
  return {
    httpCode: asInt(raw) ?? 0,
    response:
      resp != null && typeof resp === 'object'
        ? (resp as Record<string, unknown>)
        : null,
  };
}
