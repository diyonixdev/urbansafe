/**
 * Minimal browser environment polyfills so the demo emergency store
 * (localStorage + BroadcastChannel based) can run under plain Node.
 * Must be imported BEFORE the emergency service module.
 */

class MemoryStorage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

interface FakeMessageEvent {
  data: unknown;
}

class FakeBroadcastChannel {
  static instances: FakeBroadcastChannel[] = [];
  onmessage: ((ev: FakeMessageEvent) => void) | null = null;
  onmessageerror: ((ev: FakeMessageEvent) => void) | null = null;
  name: string;

  constructor(name: string) {
    this.name = name;
    FakeBroadcastChannel.instances.push(this);
  }

  postMessage(data: unknown): void {
    for (const ch of FakeBroadcastChannel.instances) {
      if (ch !== this && ch.name === this.name && typeof ch.onmessage === "function") {
        ch.onmessage({ data });
      }
    }
  }

  close(): void {
    // no-op
  }
}

const w = globalThis as unknown as {
  window: unknown;
  localStorage: unknown;
  BroadcastChannel: unknown;
  addEventListener: unknown;
  removeEventListener: unknown;
  navigator: unknown;
};

w.window = globalThis;
w.localStorage = new MemoryStorage();
w.BroadcastChannel = FakeBroadcastChannel;
w.addEventListener = () => {};
w.removeEventListener = () => {};
