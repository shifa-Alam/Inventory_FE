import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-paginator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="paginator" *ngIf="pages > 1 || total > 0">
      <span class="page-info">
        {{ (page - 1) * pageSize + 1 }}–{{ min(page * pageSize, total) }} of {{ total }}
      </span>
      <div class="page-controls">
        <button class="page-btn" [disabled]="page <= 1" (click)="go(page - 1)">‹</button>
        <ng-container *ngFor="let p of pageNumbers()">
          <button *ngIf="p !== -1" class="page-btn" [class.active]="p === page" (click)="go(p)">{{ p }}</button>
          <span *ngIf="p === -1" class="page-ellipsis">…</span>
        </ng-container>
        <button class="page-btn" [disabled]="page >= pages" (click)="go(page + 1)">›</button>
      </div>
    </div>
  `,
  styles: [`
    .paginator {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-top: 1px solid var(--border);
      font-size: 13px;
    }
    .page-info { color: var(--text-muted); }
    .page-controls { display: flex; gap: 4px; align-items: center; }
    .page-btn {
      min-width: 32px; height: 32px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text);
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: background 0.1s, color 0.1s;
      padding: 0 8px;
    }
    .page-btn:hover:not(:disabled):not(.active) { background: var(--primary-light); }
    .page-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }
    .page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .page-ellipsis { color: var(--text-muted); padding: 0 4px; }
  `]
})
export class PaginatorComponent {
  @Input() page = 1;
  @Input() pages = 1;
  @Input() total = 0;
  @Input() pageSize = 20;
  @Output() pageChange = new EventEmitter<number>();

  go(p: number) { this.pageChange.emit(p); }

  min(a: number, b: number) { return Math.min(a, b); }

  pageNumbers(): number[] {
    if (this.pages <= 7) return Array.from({ length: this.pages }, (_, i) => i + 1);
    const result: number[] = [];
    const p = this.page;
    const last = this.pages;
    result.push(1);
    if (p > 3) result.push(-1);
    for (let i = Math.max(2, p - 1); i <= Math.min(last - 1, p + 1); i++) result.push(i);
    if (p < last - 2) result.push(-1);
    result.push(last);
    return result;
  }
}
