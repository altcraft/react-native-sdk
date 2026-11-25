/** Subscription data for push/email/SMS channels. */
export type EmailSubscription = {
  type: 'email';
  resourceId: number;
  email: string;
  status?: string | null;
  priority?: number | null;
  customFields?: Record<string, unknown> | null;
  cats?: string[] | null;
};

/** SMS subscription data. */
export type SmsSubscription = {
  type: 'sms';
  resourceId: number;
  phone: string;
  status?: string | null;
  priority?: number | null;
  customFields?: Record<string, unknown> | null;
  cats?: string[] | null;
};

/** Push subscription data. */
export type PushSubscription = {
  type: 'push';
  resourceId: number;
  provider: string;
  subscriptionId: string;
  status?: string | null;
  priority?: number | null;
  customFields?: Record<string, unknown> | null;
  cats?: string[] | null;
};

/** CC-data subscription (Telegram, WhatsApp, Viber, Notify). */
export type CcDataSubscription = {
  type: 'cc_data';
  resourceId: number;
  channel: string;
  ccData: Record<string, unknown>;
  status?: string | null;
  priority?: number | null;
  customFields?: Record<string, unknown> | null;
  cats?: string[] | null;
};

/** Union of all supported subscription types. */
export type Subscription =
  | EmailSubscription
  | SmsSubscription
  | PushSubscription
  | CcDataSubscription;

/** Email subscription factory. */
export function emailSubscription(options: {
  resourceId: number;
  email: string;
  status?: string | null;
  priority?: number | null;
  customFields?: Record<string, unknown> | null;
  cats?: string[] | null;
}): EmailSubscription {
  return { type: 'email', ...options };
}

/** SMS subscription factory. */
export function smsSubscription(options: {
  resourceId: number;
  phone: string;
  status?: string | null;
  priority?: number | null;
  customFields?: Record<string, unknown> | null;
  cats?: string[] | null;
}): SmsSubscription {
  return { type: 'sms', ...options };
}

/** Push subscription factory. */
export function pushSubscription(options: {
  resourceId: number;
  provider: string;
  subscriptionId: string;
  status?: string | null;
  priority?: number | null;
  customFields?: Record<string, unknown> | null;
  cats?: string[] | null;
}): PushSubscription {
  return { type: 'push', ...options };
}

/** Custom channel data subscription factory. */
export function ccDataSubscription(options: {
  resourceId: number;
  channel: string;
  ccData: Record<string, unknown>;
  status?: string | null;
  priority?: number | null;
  customFields?: Record<string, unknown> | null;
  cats?: string[] | null;
}): CcDataSubscription {
  return { type: 'cc_data', ...options };
}

/**
 * Flattens a subscription into a string map accepted by the native bridge.
 *
 * The native side reconstructs the typed subscription model from this map.
 */
export function subscriptionToNative(
  subscription: Subscription | null
): Record<string, string> | null {
  if (subscription == null) return null;

  const map: Record<string, string> = {
    type: subscription.type,
    channel: subscription.type,
    resource_id: String(subscription.resourceId),
  };

  if (subscription.status != null) map.status = subscription.status;
  if (subscription.priority != null) map.priority = String(subscription.priority);

  if (subscription.customFields != null) {
    map.custom_fields = safeJson(subscription.customFields, '{}');
  }
  if (subscription.cats != null) {
    map.cats = safeJson(subscription.cats, '[]');
  }

  switch (subscription.type) {
    case 'email':
      map.email = subscription.email;
      break;
    case 'sms':
      map.phone = subscription.phone;
      break;
    case 'push':
      map.provider = subscription.provider;
      map.subscription_id = subscription.subscriptionId;
      break;
    case 'cc_data':
      map.channel = subscription.channel;
      map.cc_data = safeJson(subscription.ccData, '{}');
      break;
  }

  return map;
}

/**
 * Flattens a subscription into a string map accepted by the native bridge.
 *
 * Alias kept for the former `Utilities.subscriptionToNativeMap` helper.
 */
export function subscriptionToNativeMap(
  subscription: Subscription | null
): Record<string, string> | null {
  return subscriptionToNative(subscription);
}

function safeJson(value: unknown, fallback: string): string {
  try {
    return JSON.stringify(value) ?? fallback;
  } catch {
    return fallback;
  }
}
