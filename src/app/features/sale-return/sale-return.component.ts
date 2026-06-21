import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../shared/services/toast.service';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-sale-return',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './sale-return.component.html',
  styleUrls: ['./sale-return.component.css']
})
export class SaleReturnComponent implements OnInit {

  // Invoice search
  invoiceQuery = '';
  invoiceResults: any[] = [];
  loadingInvoice = false;

  // Loaded sale
  sale: any = null;
  returnItems: ReturnRow[] = [];
  reason = '';

  // History
  returns: any[] = [];
  loadingReturns = false;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() { this.loadReturns(); }

  // ── Invoice search ────────────────────────────────────────────
  searchInvoice() {
    const q = this.invoiceQuery.trim();
    if (!q) return;
    this.loadingInvoice = true;
    this.invoiceResults = [];
    this.api.get(`/sales/?invoice_no=${encodeURIComponent(q)}&page=1&page_size=10`).subscribe({
      next: (res: any) => {
        this.invoiceResults = res.data ?? res;
        this.loadingInvoice = false;
      },
      error: () => { this.toast.error('Invoice not found'); this.loadingInvoice = false; }
    });
  }

  selectInvoice(inv: any) {
    this.api.get(`/sales/${inv.id}`).subscribe({
      next: (sale: any) => {
        this.sale = sale;
        // Each item now carries returned_qty from the DB
        this.returnItems = (sale.items || [])
          .map((item: any) => {
            const returned = item.returned_qty || 0;
            const remaining = item.quantity - returned;
            return {
              product_id: item.product_id,
              product_name: item.product_name,
              sold_qty: item.quantity,
              already_returned: returned,
              max_qty: remaining,
              rate: item.rate,
              return_qty: 0
            };
          })
          .filter((row: ReturnRow) => row.max_qty > 0);
        this.invoiceResults = [];
        this.invoiceQuery = '';
      },
      error: () => this.toast.error('Failed to load invoice')
    });
  }

  clearSale() {
    this.sale = null;
    this.returnItems = [];
    this.reason = '';
    this.invoiceQuery = '';
    this.invoiceResults = [];
  }

  // ── Calculations ──────────────────────────────────────────────
  get returnGross(): number {
    return this.returnItems.reduce((s, i) => s + (i.return_qty * i.rate), 0);
  }

  get discountRate(): number {
    if (!this.sale) return 0;
    const subtotal = (this.sale.total_amount || 0) + (this.sale.discount_amount || 0);
    if (!subtotal) return 0;
    return (this.sale.discount_amount || 0) / subtotal;
  }

  get discountDeduction(): number {
    return this.returnGross * this.discountRate;
  }

  get returnNet(): number {
    return this.returnGross - this.discountDeduction;
  }

  hasAnyReturn(): boolean {
    return this.returnItems.some(i => i.return_qty > 0);
  }

  clampQty(row: ReturnRow) {
    if (row.return_qty < 0) row.return_qty = 0;
    if (row.return_qty > row.max_qty) row.return_qty = row.max_qty;
  }

  // ── Submit ────────────────────────────────────────────────────
  submit() {
    if (!this.sale) { this.toast.warning('Please select an invoice first.'); return; }
    if (!this.hasAnyReturn()) { this.toast.warning('Please enter return quantity for at least one item.'); return; }
    if (!this.reason.trim()) { this.toast.warning('Please enter a reason for the return.'); return; }

    const payload = {
      sale_id: this.sale.id,
      customer_id: this.sale.customer_id,
      reason: this.reason.trim(),
      items: this.returnItems
        .filter(i => i.return_qty > 0)
        .map(i => ({ product_id: i.product_id, quantity: i.return_qty, rate: i.rate }))
    };

    this.toast.startSaving();
    this.api.post('/sale-returns/', payload).subscribe({
      next: (res: any) => {
        this.toast.stopSaving();
        this.toast.success(`Return recorded: ${res.return_no} — Refund ৳${res.refund_amount?.toFixed(2)}`);
        this.clearSale();
        this.loadReturns();
      },
      error: (err) => { this.toast.stopSaving(); this.toast.error(err?.error?.detail || 'Failed to save return'); }
    });
  }

  // ── History ───────────────────────────────────────────────────
  loadReturns() {
    this.loadingReturns = true;
    this.api.get('/sale-returns/').subscribe({
      next: (res: any) => { this.returns = res.data ?? res; this.loadingReturns = false; },
      error: () => { this.loadingReturns = false; }
    });
  }
}

interface ReturnRow {
  product_id: number;
  product_name: string;
  sold_qty: number;
  already_returned: number;
  max_qty: number;
  rate: number;
  return_qty: number;
}
