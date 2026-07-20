import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);
  saving  = signal(false);

  private next = 0;
  private lastByKey = new Map<string, number>();  // type|message → last shown (ms)
  private lastErrorAt = 0;

  private add(message: string, type: ToastType) {
    if (!message) return;
    const now = Date.now();

    // De-duplicate: the same toast fired twice in quick succession (e.g. the
    // global error interceptor AND a component both reacting to one failed
    // request) should only appear once.
    const key = `${type}|${message}`;
    if (now - (this.lastByKey.get(key) ?? 0) < 3000) return;

    // Coalesce error bursts: a single failed action must not stack multiple
    // error toasts even when their wording differs (interceptor message vs a
    // component's custom fallback). The interceptor runs first, so its precise
    // backend message wins and the redundant one is dropped.
    if (type === 'error') {
      if (now - this.lastErrorAt < 900) return;
      this.lastErrorAt = now;
    }

    if (this.lastByKey.size > 50) this.lastByKey.clear();  // keep the dedup map small
    this.lastByKey.set(key, now);
    const id = ++this.next;
    this.toasts.update(t => [...t, { id, message, type }]);
    setTimeout(() => this.remove(id), 3500);
  }

  remove(id: number) {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }

  success(msg: string) { this.add(msg, 'success'); }
  error(msg: string)   { this.add(msg, 'error'); }
  warning(msg: string) { this.add(msg, 'warning'); }
  info(msg: string)    { this.add(msg, 'info'); }

  startSaving() { this.saving.set(true); }
  stopSaving()  { this.saving.set(false); }
}
