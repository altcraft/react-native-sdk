import { AltcraftCore, type SdkEvent } from '@altcraft/core';
import { AltcraftPush } from '@altcraft/push';
import { EventBus } from './event_bus';
import {
  Store,
  kSubscribed,
  kUnsubscribed,
  type ConfigData,
} from './store';

type AppStateListener = () => void;

/**
 * Central observable app state — mirrors AndroidModules MainViewModel.
 * Subscribes to SDK events and updates statuses, token, placement count.
 */
export class AppState {
  private static _instance: AppState | null = null;

  static get instance(): AppState {
    if (AppState._instance === null) AppState._instance = new AppState();
    return AppState._instance;
  }

  private listeners = new Set<AppStateListener>();
  private subscription: (() => void) | null = null;
  private queue: SdkEvent[] = [];
  private draining = false;

  status: string = kUnsubscribed;
  inAppStatus: string = kUnsubscribed;
  authStatus: boolean = false;
  token: string | null = null;
  provider: string | null = null;
  tokenUpdateTime: string | null = null;
  placementCount = 0;
  events: SdkEvent[] = [];

  private constructor() {}

  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(listener: AppStateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of Array.from(this.listeners)) {
      try {
        listener();
      } catch {
        // ignore listener errors
      }
    }
  }

  async init(): Promise<void> {
    if (this.subscription != null) return;
    this.subscription = EventBus.instance.subscribe((ev) => {
      this.queue.push(ev);
      void this.drainQueue();
    });

    const store = Store.instance;
    this.status = await store.getAppStatus();
    this.inAppStatus = await store.getInAppStatus();
    this.authStatus = await store.getAuthStatus();
    const token = await store.getToken();
    const provider = await store.getProvider();
    this.token = token.length > 0 ? token : null;
    this.provider = provider.length > 0 ? provider : null;
    this.tokenUpdateTime = await store.getTokenUpdateTime();
    this.notify();
  }

  async syncAuthFromSdk(): Promise<void> {
    try {
      const sdkAuth = await AltcraftCore.isAuthenticated();
      if (sdkAuth !== this.authStatus) {
        this.authStatus = sdkAuth;
        await Store.instance.saveAuthStatus(sdkAuth);
        this.notify();
      }
    } catch {
      // ignore
    }
  }

  async reloadFromStore(): Promise<void> {
    const store = Store.instance;
    this.status = await store.getAppStatus();
    this.inAppStatus = await store.getInAppStatus();
    this.authStatus = await store.getAuthStatus();
    this.notify();
  }

  async updateTokenUi(): Promise<void> {
    try {
      const tokenData = await AltcraftPush.getPushToken();
      if (tokenData != null) {
        this.token = tokenData.token;
        this.provider = tokenData.provider;
        await Store.instance.saveTokenData(tokenData.provider, tokenData.token);
      } else {
        this.token = null;
        this.provider = null;
      }
      this.tokenUpdateTime =
        this.tokenUpdateTime ?? (await Store.instance.getTokenUpdateTime());
      this.notify();
    } catch {
      // ignore
    }
  }

  async handleCleared(): Promise<void> {
    this.token = null;
    this.provider = null;
    this.status = kUnsubscribed;
    this.inAppStatus = kUnsubscribed;
    this.authStatus = false;
    this.tokenUpdateTime = null;
    await Store.instance.saveAppStatus(kUnsubscribed);
    await Store.instance.saveInAppStatus(kUnsubscribed);
    await Store.instance.saveAuthStatus(false);
    this.notify();
  }

  clearEvents(): void {
    this.events = [];
    this.notify();
  }

  private async drainQueue(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    while (this.queue.length > 0) {
      const ev = this.queue.shift();
      if (ev == null) continue;
      try {
        await this.handleEvent(ev);
      } catch (e) {
        console.log('Event handling error:', e);
      }
    }
    this.draining = false;
  }

  private async handleEvent(ev: SdkEvent): Promise<void> {
    this.events = [...this.events, ev];
    if (this.events.length > 200) {
      this.events = this.events.slice(this.events.length - 200);
    }

    const msg = ev.message ?? '';
    const value = ev.value as Record<string, unknown> | null | undefined;
    const store = Store.instance;

    // Push subscription status events
    if (
      msg.includes('successful request: push/subscribe') ||
      msg.includes('successful request: push/suspend') ||
      msg.includes('successful request: push/unsubscribe') ||
      msg.includes('successful request: push/status')
    ) {
      const status = this.subscriptionStatusFrom(value) ?? kUnsubscribed;
      this.status = status;
      await store.saveAppStatus(status);
    } else if (msg.includes('failed request: push/status')) {
      const errorText = this.errorTextFrom(value);
      if (errorText?.includes('profile not found') === true || ev.code === 404) {
        this.status = kUnsubscribed;
        await store.saveAppStatus(this.status);
      }
    } else if (msg.includes('successful request: push/update')) {
      const sub = this.subscriptionFrom(value);
      if (sub != null) {
        const subscriptionId = sub['subscriptionId'];
        const provider = sub['provider'];
        if (subscriptionId != null && provider != null) {
          this.token = String(subscriptionId);
          this.provider = String(provider);
          await store.saveTokenData(String(provider), String(subscriptionId));
        }
      }
      this.tokenUpdateTime = ev.timestamp ?? null;
      if (this.tokenUpdateTime != null) {
        await store.saveTokenUpdateTime(this.tokenUpdateTime);
      }
    } else if (msg.includes('push provider set')) {
      this.tokenUpdateTime = ev.timestamp ?? null;
      if (this.tokenUpdateTime != null) {
        await store.saveTokenUpdateTime(this.tokenUpdateTime);
      }
      await this.updateTokenUi();
    } else if (msg.startsWith('SDK configuration is installed')) {
      await this.updateTokenUi();
      this.status = await store.getAppStatus();
    } else if (msg.includes('SDK data has been cleared')) {
      await this.handleCleared();
    } else if (msg.includes('successful request: profile/authenticate')) {
      this.authStatus = true;
      await store.saveAuthStatus(true);
    } else if (
      msg.toLowerCase().includes('user logged out') ||
      msg.toLowerCase().includes('user is not authenticated')
    ) {
      this.authStatus = false;
      await store.saveAuthStatus(false);
    } else if (msg.includes('successful request: inapp/subscribe')) {
      this.inAppStatus = kSubscribed;
      await store.saveInAppStatus(this.inAppStatus);
    } else if (msg.includes('successful request: inapp/unsubscribe')) {
      this.inAppStatus = kUnsubscribed;
      await store.saveInAppStatus(this.inAppStatus);
    } else if (msg.includes('successful request: inapp/status')) {
      const sub = this.subscriptionFrom(value);
      this.inAppStatus =
        sub != null && sub['status'] != null
          ? String(sub['status'])
          : kUnsubscribed;
      await store.saveInAppStatus(this.inAppStatus);
    } else if (msg.includes('successful request: inapp/placements')) {
      const smids = value?.['all_smid'];
      this.placementCount = Array.isArray(smids) ? smids.length : 0;
    }

    this.notify();
  }

  private subscriptionFrom(
    value: Record<string, unknown> | null | undefined
  ): Record<string, unknown> | null {
    if (value == null || typeof value !== 'object') return null;
    const profile = value['profile'];
    if (profile == null || typeof profile !== 'object') return null;
    const sub = (profile as Record<string, unknown>)['subscription'];
    if (sub == null || typeof sub !== 'object') return null;
    return sub as Record<string, unknown>;
  }

  private subscriptionStatusFrom(
    value: Record<string, unknown> | null | undefined
  ): string | null {
    const sub = this.subscriptionFrom(value);
    return sub != null && sub['status'] != null ? String(sub['status']) : null;
  }

  private errorTextFrom(
    value: Record<string, unknown> | null | undefined
  ): string | null {
    if (value == null) return null;
    const v = value['response_with_http_code'];
    return v != null ? JSON.stringify(v) : JSON.stringify(value);
  }
}

/** Config type re-export for convenience. */
export type { ConfigData };
