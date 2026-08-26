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
          <span class="toast-icon-badge"><span class="toast-icon">{{ icons[t.type] }}</span></span>
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
    @media (max-width: 640px) {
      .progress-bar {
        top: auto; bottom: 62px; height: 3px;
      }
    }
    .toast-container {
      position: fixed; bottom: 24px; right: 24px;
      display: flex; flex-direction: column; gap: 10px; z-index: 9998;
      align-items: flex-end;
    }
    .toast {
      display: flex; align-items: center; gap: 11px;
      padding: 13px 18px 13px 14px; border-radius: 14px; min-width: 260px; max-width: 380px;
      color: #fff; font-size: 14px; font-weight: 500; cursor: pointer;
      box-shadow: 0 8px 24px -4px rgba(0,0,0,.22), 0 2px 8px rgba(0,0,0,.12);
      border: 1px solid rgba(255,255,255,0.14);
      animation: slideIn .3s cubic-bezier(0.2, 0, 0, 1);
    }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }
    .toast-icon-badge {
      flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%;
      background: rgba(255,255,255,0.22);
      display: flex; align-items: center; justify-content: center;
    }
    .toast-icon { font-size: 13px; line-height: 1; }
    .toast-msg { line-height: 1.35; }
    .toast-success { background: linear-gradient(155deg, #22c55e, #16a34a); }
    .toast-error   { background: linear-gradient(155deg, #f87171, #ef4444); }
    .toast-warning { background: linear-gradient(155deg, #fbbf24, #f59e0b); }
    .toast-info    { background: linear-gradient(155deg, #60a5fa, #3b82f6); }

    /* Mobile: the desktop right-slide banner reads as a leftover desktop
       pattern on a phone, and bottom:24px sits inside the bottom-nav's own
       68px band — the toast used to render on top of the nav, hiding it.
       Center it above the nav instead, sliding up from the bottom like a
       native iOS/Android in-app banner. */
    @media (max-width: 640px) {
      .toast-container {
        left: 12px; right: 12px; bottom: calc(68px + env(safe-area-inset-bottom) + 12px);
        align-items: center;
      }
      .toast { width: 100%; max-width: 440px; animation: slideUp .3s cubic-bezier(0.2, 0, 0, 1); }
      @keyframes slideUp {
        from { transform: translateY(16px); opacity: 0; }
        to   { transform: translateY(0);    opacity: 1; }
      }
    }
  `]
})
export class ToastComponent {
  toast = inject(ToastService);
  icons: Record<string, string> = {
    success: '✓', error: '✕', warning: '⚠', info: 'ℹ'
  };
}
