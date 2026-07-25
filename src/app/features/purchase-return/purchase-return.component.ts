import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../shared/services/toast.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';

@Component({
  selector: 'app-purchase-return',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, PaginatorComponent],
  templateUrl: './purchase-return.component.html',
  styleUrls: ['./purchase-return.component.css']
})
export class PurchaseReturnComponent implements OnInit {
  // recent purchases to pick from
  purchases: any[] = [];
  loadingPurchases = false;
  purchasePage = 1; purchasePages = 1; purchaseTotal = 0; purchasePageSize = 10;
  searchInvoice = '';
  private searchTimer: any;

  // selected purchase + its items
  selected: any = null;         // full purchase detail with items
  reason = '';
  saving = false;

  // history
  history: any[] = [];
  loadingHistory = false;
  histPage = 1; histPages = 1; histTotal = 0; histPageSize = 10;

  constructor(private api: ApiService, private toast: ToastService, private translate: TranslateService) {}

  ngOnInit() {
    this.loadPurchases();
    this.loadHistory();
  }

  loadPurchases() {
    this.loadingPurchases = true;
    // The purchase list has no server-side invoice filter; filter the page client-side.
    this.api.get(`/purchases/?page=${this.purchasePage}&page_size=${this.purchasePageSize}`).subscribe({
      next: (res: any) => {
        let rows = res.data ?? res;
        if (this.searchInvoice.trim()) {
          const s = this.searchInvoice.trim().toLowerCase();
          rows = rows.filter((p: any) => (p.invoice_no || '').toLowerCase().includes(s));
        }
        this.purchases = rows;
        this.purchaseTotal = res.total ?? rows.length;
        this.purchasePages = res.pages ?? 1;
        this.loadingPurchases = false;
      },
      error: () => { this.loadingPurchases = false; }
    });
  }

  onSearch() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.purchasePage = 1; this.loadPurchases(); }, 300);
  }

  onPurchasePage(p: number) { this.purchasePage = p; this.loadPurchases(); }

  selectPurchase(p: any) {
    if (this.selected?.id === p.id) { this.clearSelection(); return; }
    this.api.get(`/purchases/${p.id}`).subscribe({
      next: (detail: any) => {
        detail.items = (detail.items || []).map((it: any) => ({
          ...it,
          returnable: (it.quantity ?? 0) - (it.returned_qty ?? 0),
          return_qty: 0
        }));
        this.selected = detail;
        this.reason = '';
      },
      error: () => this.toast.error(this.translate.instant('purchase_return.load_detail_failed'))
    });
  }

  clearSelection() { this.selected = null; this.reason = ''; }

  get returnLines() {
    return (this.selected?.items || []).filter((i: any) => i.return_qty > 0);
  }

  get returnTotal(): number {
    return this.returnLines.reduce((s: number, i: any) => s + i.return_qty * (i.unit_cost ?? i.rate), 0);
  }

  get isValid(): boolean {
    const lines = this.returnLines;
    if (!lines.length) return false;
    return lines.every((i: any) => i.return_qty > 0 && i.return_qty <= i.returnable);
  }

  save() {
    if (!this.isValid || !this.selected) return;
    this.saving = true;
    const payload = {
      purchase_id: this.selected.id,
      reason: this.reason.trim() || null,
      items: this.returnLines.map((i: any) => ({ product_id: i.product_id, quantity: +i.return_qty }))
    };
    this.api.post('/purchase-returns/', payload).subscribe({
      next: (res: any) => {
        this.saving = false;
        this.toast.success(this.translate.instant('purchase_return.save_success', { ref: res.return_no, total: res.total_returned, due: res.purchase_due_remaining }));
        this.clearSelection();
        this.loadPurchases();
        this.histPage = 1;
        this.loadHistory();
      },
      error: (err) => {
        this.saving = false;
        this.toast.error(err?.error?.detail || this.translate.instant('purchase_return.save_failed'));
      }
    });
  }

  loadHistory() {
    this.loadingHistory = true;
    this.api.get(`/purchase-returns/?page=${this.histPage}&page_size=${this.histPageSize}`).subscribe({
      next: (res: any) => {
        this.history = res.data ?? res;
        this.histTotal = res.total ?? this.history.length;
        this.histPages = res.pages ?? 1;
        this.loadingHistory = false;
      },
      error: () => { this.loadingHistory = false; }
    });
  }

  onHistPage(p: number) { this.histPage = p; this.loadHistory(); }
}
