import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';

@Component({
  selector: 'app-supplier-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginatorComponent],
  templateUrl: './supplier-payment.component.html',
  styleUrls: ['./supplier-payment.component.css']
})
export class SupplierPaymentComponent implements OnInit {

  /* pending purchase invoices */
  invoices: any[] = [];
  loadingInvoices = false;
  invoicePage = 1;
  invoicePages = 1;
  invoiceTotal = 0;
  invoicePageSize = 15;

  /* selected invoice & payment form */
  selected: any = null;
  payAmount: number | null = null;
  payNote = '';
  paying = false;
  successMsg = '';
  errorMsg = '';

  /* summary */
  summary = { today_payments: 0, total_payments: 0, total_transactions: 0, pending_invoices: 0, total_payable: 0 };

  /* payment history */
  history: any[] = [];
  loadingHistory = false;
  histPage = 1;
  histPages = 1;
  histTotal = 0;
  histPageSize = 10;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadSummary();
    this.loadInvoices();
    this.loadHistory();
  }

  get maxDue(): number { return this.selected?.due_amount ?? 0; }
  get afterPayment(): number { return Math.max(0, this.maxDue - (this.payAmount || 0)); }
  get isValid(): boolean {
    const amt = this.payAmount || 0;
    return amt > 0 && amt <= this.maxDue + 0.001;
  }

  fmt(n: number): string { return Math.round(n ?? 0).toLocaleString('en-US'); }

  loadSummary(): void {
    this.api.get('/supplier-payments/summary').subscribe((res: any) => { this.summary = res; });
  }

  loadInvoices(): void {
    this.loadingInvoices = true;
    const qs = new URLSearchParams({ has_due: 'true', page: String(this.invoicePage), page_size: String(this.invoicePageSize) }).toString();
    this.api.get(`/purchases/?${qs}`).subscribe({
      next: (res: any) => {
        this.invoices = res.data ?? res;
        this.invoiceTotal = res.total ?? this.invoices.length;
        this.invoicePages = res.pages ?? 1;
        this.loadingInvoices = false;
      },
      error: () => { this.loadingInvoices = false; }
    });
  }

  onInvoicePage(p: number): void { this.invoicePage = p; this.loadInvoices(); }

  select(inv: any): void {
    if (this.selected?.id === inv.id) { this.clearSelection(); return; }
    this.selected = inv;
    this.payAmount = null;
    this.payNote = '';
    this.successMsg = '';
    this.errorMsg = '';
  }

  clearSelection(): void {
    this.selected = null;
    this.payAmount = null;
    this.payNote = '';
  }

  setFullPay(): void { this.payAmount = this.maxDue; }

  pay(): void {
    if (!this.isValid || !this.selected) return;
    this.paying = true;
    this.successMsg = '';
    this.errorMsg = '';

    this.api.post('/supplier-payments/', {
      purchase_id: this.selected.id,
      amount: +(this.payAmount || 0),
      note: this.payNote || null
    }).subscribe({
      next: (res: any) => {
        this.successMsg = `৳${this.fmt(res.amount)} paid · Ref: ${res.reference_no}`;
        this.paying = false;
        this.payAmount = null;
        this.payNote = '';
        // keep the panel open, reflect the new remaining due
        if (this.selected) {
          this.selected.due_amount = res.purchase_due_remaining;
          this.selected.paid_amount = (this.selected.paid_amount || 0) + (res.amount || 0);
        }
        this.loadSummary();
        this.invoicePage = 1;
        this.loadInvoices();
        this.histPage = 1;
        this.loadHistory();
        setTimeout(() => this.successMsg = '', 6000);
      },
      error: (err: any) => {
        this.errorMsg = err?.error?.detail || 'Failed to record payment';
        this.paying = false;
      }
    });
  }

  loadHistory(): void {
    this.loadingHistory = true;
    const qs = new URLSearchParams({ page: String(this.histPage), page_size: String(this.histPageSize) }).toString();
    this.api.get(`/supplier-payments/?${qs}`).subscribe({
      next: (res: any) => {
        this.history = res.data ?? res;
        this.histTotal = res.total ?? this.history.length;
        this.histPages = res.pages ?? 1;
        this.loadingHistory = false;
      },
      error: () => { this.loadingHistory = false; }
    });
  }

  onHistPage(p: number): void { this.histPage = p; this.loadHistory(); }
}
