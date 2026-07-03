import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmService } from '../../services/confirm.service';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (confirm.state(); as s) {
      <div class="cm-backdrop" (click)="confirm.answer(false)">
        <div class="cm-modal" (click)="$event.stopPropagation()">
          <div class="cm-icon" [class.cm-icon-danger]="s.danger">
            <svg width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <p class="cm-msg">{{ s.message }}</p>
          <div class="cm-actions">
            <button class="cm-btn cm-cancel" (click)="confirm.answer(false)">Cancel</button>
            <button class="cm-btn" [class.cm-danger]="s.danger" [class.cm-primary]="!s.danger" (click)="confirm.answer(true)">
              {{ s.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .cm-backdrop {
      position: fixed; inset: 0; background: rgba(15,23,42,.45);
      z-index: 10000; display: flex; align-items: center; justify-content: center;
      padding: 20px;
      animation: cmFade .15s ease;
    }
    @keyframes cmFade { from { opacity: 0; } to { opacity: 1; } }

    .cm-modal {
      background: #fff; border-radius: 16px;
      padding: 28px 24px 20px;
      width: 100%; max-width: 340px;
      box-shadow: 0 20px 60px rgba(0,0,0,.18);
      text-align: center;
      animation: cmSlide .18s ease;
    }
    @keyframes cmSlide { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    .cm-icon {
      width: 52px; height: 52px; border-radius: 50%;
      background: #fef2f2; display: flex; align-items: center; justify-content: center;
      margin: 0 auto 14px;
    }
    .cm-icon svg { stroke: #ef4444; }
    .cm-icon-danger { background: #fef2f2; }
    .cm-icon-danger svg { stroke: #ef4444; }

    .cm-msg {
      font-size: 14px; font-weight: 500; color: #1e293b;
      line-height: 1.5; margin-bottom: 20px;
    }

    .cm-actions {
      display: flex; gap: 10px;
    }

    .cm-btn {
      flex: 1; padding: 10px 0; border: none; border-radius: 10px;
      font-size: 13.5px; font-weight: 600; cursor: pointer;
      font-family: inherit; transition: opacity .15s;
    }
    .cm-btn:hover { opacity: .85; }
    .cm-cancel  { background: #f1f5f9; color: #64748b; }
    .cm-danger  { background: #ef4444; color: #fff; }
    .cm-primary { background: #6366f1; color: #fff; }
  `]
})
export class ConfirmModalComponent {
  confirm = inject(ConfirmService);
}
