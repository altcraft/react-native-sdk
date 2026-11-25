import { AltcraftCore, type SdkEvent } from '@altcraft/core';

type SdkEventHandler = (event: SdkEvent) => void;

/**
 * Central event bus — all SDK events flow through here.
 * Both HomeScreen and LogsScreen listen to this single source.
 */
export class EventBus {
  private static _instance: EventBus | null = null;

  static get instance(): EventBus {
    if (EventBus._instance === null) EventBus._instance = new EventBus();
    return EventBus._instance;
  }

  private subscribers = new Set<SdkEventHandler>();
  private history: SdkEvent[] = [];

  private constructor() {}

  /** Current session events (for late subscribers). */
  get events(): SdkEvent[] {
    return this.history;
  }

  /** Start listening to the native SDK and forward events to all subscribers. */
  init(): void {
    AltcraftCore.subscribeToEvents(this.dispatch);
  }

  /** Subscribes to the SDK event stream. Returns an unsubscribe function. */
  subscribe(handler: SdkEventHandler): () => void {
    this.subscribers.add(handler);
    for (const ev of this.history) {
      try {
        handler(ev);
      } catch {
        // ignore handler errors
      }
    }
    return () => {
      this.subscribers.delete(handler);
    };
  }

  /** Add an event directly (for testing or internal use). */
  add = (event: SdkEvent): void => {
    this.history.push(event);
    if (this.history.length > 200) {
      this.history.splice(0, this.history.length - 200);
    }
    for (const handler of Array.from(this.subscribers)) {
      try {
        handler(event);
      } catch {
        // ignore handler errors
      }
    }
  };

  /** Dispose — stop forwarding and clear subscribers. */
  dispose(): void {
    AltcraftCore.unsubscribeFromEvents(this.dispatch);
    this.subscribers.clear();
  }

  private dispatch = (event: SdkEvent): void => {
    this.add(event);
  };
}
