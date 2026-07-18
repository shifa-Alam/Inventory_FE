import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of, Subject } from 'rxjs';
import { catchError, debounceTime, switchMap } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../shared/services/toast.service';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';

@Component({
  selector: 'app-stock-count',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginatorComponent],
  templateUrl: './stock-count.component.html',
  styleUrls: ['./stock-count.component.css']
})
export class StockCountComponent implements OnInit {
  // product picker
  search = '';
  results: any[] = [];
  searching = false;
  private search$ = new Subject<string>();

  selected: any = null;         // { id, name, sku, current_stock }
  countedQty: number | null = null;
  reason = '';
  saving = false;

  // history
  history: any[] = [];
  loadingHistory = false;
  page = 1; pages = 1; total = 0; pageSize = 15;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() {
    this.search$.pipe(
      debounceTime(300),
      // catchError inside switchMap: an API failure must not kill the
      // outer subscription, or search silently stops working afterwards
      switchMap(v => v
        ? this.api.get(`/products/search?q=${encodeURIComponent(v)}`).pipe(
            catchError(() => { this.searching = false; return of([]); })
          )
        : [])
    ).subscribe({
      next: (res: any) => { this.results = res.data ?? res; this.searching = false; },
      error: () => { this.searching = false; }
    });
    this.loadHistory();
  }

  onSearch(v: string) {
    if (!v || v.length < 2) { this.results = []; return; }
    this.searching = true;
    this.search$.next(v);
  }

  pick(p: any) {
    this.selected = p;
    this.results = [];
    this.search = '';
    this.countedQty = null;
    this.reason = '';
  }

  clearSelection() { this.selected = null; this.countedQty = null; this.reason = ''; }

  get difference(): number | null {
    if (this.selected == null || this.countedQty == null) return null;
    return +(this.countedQty - (this.selected.current_stock ?? 0)).toFixed(3);
  }

  get isValid(): boolean {
    return !!this.selected && this.countedQty != null && this.countedQty >= 0;
  }

  save() {
    if (!this.isValid) return;
    this.saving = true;
    this.api.post('/stock-counts/', {
      product_id: this.selected.id,
      counted_qty: +this.countedQty!,
      reason: this.reason.trim() || null
    }).subscribe({
      next: (res: any) => {
        this.saving = false;
        const d = res.difference;
        const msg = d === 0 ? 'No variance' : (d < 0 ? `Shrinkage ${d}` : `Found +${d}`);
        this.toast.success(`${res.count_no} · ${msg} · stock now ${res.new_stock}`);
        this.clearSelection();
        this.page = 1;
        this.loadHistory();
      },
      error: (err) => {
        this.saving = false;
        this.toast.error(err?.error?.detail || 'Failed to record stock count.');
      }
    });
  }

  loadHistory() {
    this.loadingHistory = true;
    this.api.get(`/stock-counts/?page=${this.page}&page_size=${this.pageSize}`).subscribe({
      next: (res: any) => {
        this.history = res.data ?? res;
        this.total = res.total ?? this.history.length;
        this.pages = res.pages ?? 1;
        this.loadingHistory = false;
      },
      error: () => { this.loadingHistory = false; }
    });
  }

  onPage(p: number) { this.page = p; this.loadHistory(); }
}
