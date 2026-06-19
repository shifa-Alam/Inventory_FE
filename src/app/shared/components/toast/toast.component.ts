import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (toast.saving()) {
      <div class="progress-bar"><div class="progress-fill"></div></div>
    }
    <div class="toast-container">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast toast-{{ t.type }}" (click)="toast.remove(t.id)">
          <span class="toast-icon">{{ icons[t.type] }}</span>
          <span class="toast-msg">{{ t.message }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .progress-bar {
      position: fixed; top: 0; left: 0; width: 100%; height: 3px; z-index: 9999;
    }
    .progress-fill {
      height: 100%; background: #4f8ef7;
      animation: progress 1.5s ease-in-out infinite;
    }
    @keyframes progress {
      0%   { width: 0%; margin-left: 0; }
      50%  { width: 70%; margin-left: 15%; }
      100% { width: 0%; margin-left: 100%; }
    }
    .toast-container {
      position: fixed; bottom: 24px; right: 24px;
      display: flex; flex-direction: column; gap: 10px; z-index: 9998;
    }
    .toast {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 18px; border-radius: 8px; min-width: 260px; max-width: 380px;
      color: #fff; font-size: 14px; cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,.18);
      animation: slideIn .25s ease;
    }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }
    .toast-success { background: #22c55e; }
    .toast-error   { background: #ef4444; }
    .toast-warning { background: #f59e0b; }
    .toast-info    { background: #3b82f6; }
    .toast-icon    { font-size: 18px; }
  `]
})
export class ToastComponent {
  toast = inject(ToastService);
  icons: Record<string, string> = {
    success: '✓', error: '✕', warning: '⚠', info: 'ℹ'
  };
}
