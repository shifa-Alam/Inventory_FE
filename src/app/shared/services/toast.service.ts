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

  private add(message: string, type: ToastType) {
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
