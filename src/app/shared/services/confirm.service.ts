import { Injectable, signal } from '@angular/core';

export interface ConfirmState {
  message: string;
  confirmLabel: string;
  danger: boolean;
  resolve: (value: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  state = signal<ConfirmState | null>(null);

  open(message: string, options: { confirmLabel?: string; danger?: boolean } = {}): Promise<boolean> {
    return new Promise(resolve => {
      this.state.set({
        message,
        confirmLabel: options.confirmLabel ?? 'Confirm',
        danger: options.danger ?? true,
        resolve,
      });
    });
  }

  answer(value: boolean) {
    this.state()?.resolve(value);
    this.state.set(null);
  }
}
