/**
 * PERF-022: Server-Sent Events client for real-time updates.
 * Replaces polling intervals with a single persistent SSE connection.
 * Falls back to polling if SSE connection fails or is unavailable.
 */

type SSEHandler = (data: unknown) => void;

interface SSEClientOptions {
  /** SSE endpoint URL */
  url: string;
  /** Reconnect delay in ms (default: 5000) */
  reconnectDelay?: number;
  /** Max reconnect attempts before falling back (default: 5) */
  maxRetries?: number;
}

export class SSEClient {
  private eventSource: EventSource | null = null;
  private handlers = new Map<string, SSEHandler[]>();
  private url: string;
  private reconnectDelay: number;
  private maxRetries: number;
  private retryCount = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _connected = false;

  constructor(options: SSEClientOptions) {
    this.url = options.url;
    this.reconnectDelay = options.reconnectDelay ?? 5000;
    this.maxRetries = options.maxRetries ?? 5;
  }

  /**
   * Register a handler for a specific event type.
   */
  on(eventType: string, handler: SSEHandler): () => void {
    const list = this.handlers.get(eventType) || [];
    list.push(handler);
    this.handlers.set(eventType, list);
    return () => {
      const idx = list.indexOf(handler);
      if (idx >= 0) list.splice(idx, 1);
    };
  }

  /**
   * Start the SSE connection.
   */
  connect(): void {
    if (this.eventSource) return;

    try {
      this.eventSource = new EventSource(this.url);

      this.eventSource.onopen = () => {
        this._connected = true;
        this.retryCount = 0;
        console.log('[SSE] Connected to', this.url);
      };

      this.eventSource.onerror = () => {
        this._connected = false;
        this.eventSource?.close();
        this.eventSource = null;

        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          const delay = this.reconnectDelay * Math.min(this.retryCount, 4);
          console.warn(`[SSE] Connection lost, retry ${this.retryCount}/${this.maxRetries} in ${delay}ms`);
          this.reconnectTimer = setTimeout(() => this.connect(), delay);
        } else {
          console.warn('[SSE] Max retries reached, falling back to polling');
        }
      };

      this.eventSource.onmessage = (event) => {
        this.dispatch('message', event.data);
      };

      // Register named event listeners
      for (const eventType of this.handlers.keys()) {
        if (eventType === 'message') continue;
        this.eventSource.addEventListener(eventType, (event: Event) => {
          this.dispatch(eventType, (event as MessageEvent).data);
        });
      }
    } catch {
      console.warn('[SSE] Failed to create EventSource');
    }
  }

  private dispatch(eventType: string, rawData: string): void {
    const list = this.handlers.get(eventType);
    if (!list?.length) return;
    try {
      const data = JSON.parse(rawData);
      for (const handler of list) {
        try { handler(data); } catch (e) { console.error('[SSE] Handler error:', e); }
      }
    } catch {
      // Non-JSON data, pass as string
      for (const handler of list) {
        try { handler(rawData); } catch (e) { console.error('[SSE] Handler error:', e); }
      }
    }
  }

  /**
   * Whether the SSE connection is currently active.
   */
  get connected(): boolean {
    return this._connected;
  }

  /**
   * Disconnect and clean up.
   */
  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.eventSource?.close();
    this.eventSource = null;
    this._connected = false;
    this.retryCount = 0;
  }
}
