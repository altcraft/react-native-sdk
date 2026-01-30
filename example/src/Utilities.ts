export function RemoteMessagetoStringMap(input: unknown): { [key: string]: string } | null {
  if (!input || typeof input !== 'object') return null;

  const obj = input as Record<string, unknown>;
  const out: { [key: string]: string } = {};

  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    out[k] = String(v);
  }

  return Object.keys(out).length > 0 ? out : null;
}