import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../shared/services/toast.service';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { TranslatePipe } from '@ngx-translate/core';
import { skipErrorToast } from '../../core/interceptors/error.interceptor';

@Component({
  selector: 'app-shift',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, PaginatorComponent],
  templateUrl: './shift.component.html',
  styleUrls: ['./shift.component.css']
})
export class ShiftComponent implements OnInit {
  /** null = no open shift → show the "open shift" card */
  current: any = null;
  loadingCurrent = false;

  openingFloat: number | null = null;
  countedCash: number | null = null;
  closeNote = '';
  working = false;

  /** result panel shown right after a close */
  closeResult: any = null;

  history: any[] = [];
  loadingHistory = false;
  page = 1;
  pages = 1;
  total = 0;
  pageSize = 10;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit(): void {
    this.loadCurrent();
    this.loadHistory();
  }

  loadCurrent(): void {
    this.loadingCurrent = true;
    // 404 here just means no shift is open right now — a normal state at the
    // start of a day, not a failure, so it must not toast an error.
    this.api.get('/shifts/current', undefined, skipErrorToast()).subscribe({
      next: (res: any) => { this.current = res; this.loadingCurrent = false; },
      error: () => { this.current = null; this.loadingCurrent = false; }
    });
  }

  loadHistory(): void {
    this.loadingHistory = true;
    this.api.get(`/shifts/?page=${this.page}&page_size=${this.pageSize}`).subscribe({
      next: (res: any) => {
        this.history = res.data ?? [];
        this.total = res.total ?? 0;
        this.pages = res.pages ?? 1;
        this.loadingHistory = false;
      },
      error: () => { this.loadingHistory = false; }
    });
  }

  onPageChange(p: number) { this.page = p; this.loadHistory(); }

  openShift(): void {
    this.working = true;
    this.api.post('/shifts/open', { opening_float: +(this.openingFloat || 0) }).subscribe({
      next: () => {
        this.working = false;
        this.openingFloat = null;
        this.closeResult = null;
        this.toast.success('Shift opened');
        this.loadCurrent();
        this.loadHistory();
      },
      error: (err: any) => {
        this.working = false;
        this.toast.error(err?.error?.detail || 'Failed to open shift');
      }
    });
  }

  closeShift(): void {
    if (this.countedCash === null || this.countedCash < 0) {
      this.toast.warning('Count the drawer and enter the cash amount.');
      return;
    }
    this.working = true;
    this.api.post('/shifts/close', {
      counted_cash: +this.countedCash,
      note: this.closeNote?.trim() || null,
    }).subscribe({
      next: (res: any) => {
        this.working = false;
        this.closeResult = res;
        this.current = null;
        this.countedCash = null;
        this.closeNote = '';
        this.loadHistory();
      },
      error: (err: any) => {
        this.working = false;
        this.toast.error(err?.error?.detail || 'Failed to close shift');
      }
    });
  }

  methodEntries(byMethod: Record<string, number> | undefined): { method: string; amount: number }[] {
    return Object.entries(byMethod ?? {}).map(([method, amount]) => ({ method, amount }));
  }

  fmt(n: number | null | undefined): string {
    return (Math.round((n ?? 0) * 100) / 100).toLocaleString('en-US');
  }
}
