// Push.ts

export type PushPayload = Record<string, string>;

// ---------- Utils ----------

// Конвертация data payload в Record<string, string>
export function RemoteMessagetoStringMap(
  input: unknown
): Record<string, string> | null {
  if (input == null) return null;

  let obj: unknown = input;

  if (typeof obj === 'string') {
    try {
      obj = JSON.parse(obj);
    } catch {
      return null;
    }
  }

  if (typeof obj !== 'object') return null;

  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v == null) continue;
    out[k] = String(v);
  }

  return Object.keys(out).length ? out : null;
}

// ---------- FCM ----------

// Firebase config files are intentionally not included in the public example.
// Add google-services.json / GoogleService-Info.plist and restore the Firebase
// Messaging calls if you want to test FCM push delivery.
export function registerFCMPushTokenSync(): void {
  // FCM disabled in public example.
}

export function registerFCMBackgroundPush(): void {
  // FCM disabled in public example.
}

export function registerFCMForegroundPush(): void {
  // FCM disabled in public example.
}

// ---------- Facade ----------

export const Push = {
  registerFCMPushTokenSync,
  registerFCMBackgroundPush,
  registerFCMForegroundPush,
} as const;
