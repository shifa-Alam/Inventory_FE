import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';

@Component({
  selector: 'app-customer-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, PaginatorComponent],
  templateUrl: './customer-payment.component.html',
  styleUrls: ['./customer-payment.component.css']
})
export class CustomerPaymentComponent implements OnInit {

  /* pending invoices */
  invoices: any[] = [];
  loadingInvoices = false;
  invoicePage = 1;
  invoicePages = 1;
  invoiceTotal = 0;
  invoicePageSize = 15;
  searchInvoice = '';
  searchTimer: any;

  /* selected invoice & payment form */
  selectedSale: any = null;
  payAmount: number | null = null;
  payDiscount: number | null = null;
  payNote = '';
  paying = false;
  successMsg = '';
  errorMsg = '';

  /* per-invoice payment history */
  invoicePayments: any[] = [];
  loadingInvoicePayments = false;

  /* summary */
  summary = { today_collection: 0, total_collection: 0, total_discount: 0, total_transactions: 0, pending_invoices: 0 };

  /* payment history */
  history: any[] = [];
  loadingHistory = false;
  histPage = 1;
  histPages = 1;
  histTotal = 0;
  histPageSize = 10;

  constructor(private api: ApiService, private translate: TranslateService) {}

  ngOnInit(): void {
    this.loadSummary();
    this.loadInvoices();
    this.loadHistory();
  }

  get maxDue(): number { return this.selectedSale?.due_amount ?? 0; }

  get totalReduction(): number {
    return (this.payAmount || 0) + (this.payDiscount || 0);
  }

  get afterPayment(): number {
    return Math.max(0, this.maxDue - this.totalReduction);
  }

  get isValid(): boolean {
    const amt = this.payAmount || 0;
    const disc = this.payDiscount || 0;
    return (amt > 0 || disc > 0) && this.totalReduction <= this.maxDue + 0.001;
  }

  loadSummary(): void {
    this.api.get('/payments/invoice/summary').subscribe((res: any) => { this.summary = res; });
  }

  loadInvoices(): void {
    this.loadingInvoices = true;
    const params: Record<string, any> = { has_due: true, page: this.invoicePage, page_size: this.invoicePageSize };
    if (this.searchInvoice.trim()) params['invoice_no'] = this.searchInvoice.trim();
    const qs = new URLSearchParams(params).toString();
    this.api.get(`/sales/?${qs}`).subscribe({
      next: (res: any) => {
        this.invoices = res.data ?? res;
        this.invoiceTotal = res.total ?? this.invoices.length;
        this.invoicePages = res.pages ?? 1;
        this.loadingInvoices = false;
      },
      error: () => { this.loadingInvoices = false; }
    });
  }

  onSearch(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.invoicePage = 1; this.loadInvoices(); }, 350);
  }

  onInvoicePage(p: number): void { this.invoicePage = p; this.loadInvoices(); }

  selectInvoice(sale: any): void {
    if (this.selectedSale?.id === sale.id) { this.clearSelection(); return; }
    this.selectedSale = sale;
    this.payAmount = null;
    this.payDiscount = null;
    this.payNote = '';
    this.successMsg = '';
    this.errorMsg = '';
    this.loadInvoicePayments(sale.id);
  }

  clearSelection(): void {
    this.selectedSale = null;
    this.payAmount = null;
    this.payDiscount = null;
    this.payNote = '';
    this.invoicePayments = [];
  }

  loadInvoicePayments(saleId: number): void {
    this.loadingInvoicePayments = true;
    this.invoicePayments = [];
    const qs = new URLSearchParams({ sale_id: String(saleId), page_size: '50' }).toString();
    this.api.get(`/payments/invoice?${qs}`).subscribe({
      next: (res: any) => {
        this.invoicePayments = (res.data ?? res).slice().reverse();
        this.loadingInvoicePayments = false;
      },
      error: () => { this.loadingInvoicePayments = false; }
    });
  }

  setFullPay(): void { this.payAmount = this.maxDue; this.payDiscount = null; }

  pay(): void {
    if (!this.isValid || !this.selectedSale) return;
    this.paying = true;
    this.successMsg = '';
    this.errorMsg = '';

    this.api.post('/payments/invoice', {
      sale_id: this.selectedSale.id,
      amount: +(this.payAmount || 0),
      discount_amount: +(this.payDiscount || 0),
      note: this.payNote || null
    }).subscribe({
      next: (res: any) => {
        const parts = [];
        if (this.payAmount) parts.push(`৳${this.payAmount} ${this.translate.instant('customer_payment.payment_word')}`);
        if (this.payDiscount) parts.push(`৳${this.payDiscount} ${this.translate.instant('customer_payment.discount_word')}`);
        this.successMsg = `${parts.join(' + ')} | Ref: ${res.reference_no}`;
        this.paying = false;
        this.payAmount = null;
        this.payDiscount = null;
        this.payNote = '';
        // refresh the selected sale's due_amount in-place so the panel stays open
        if (this.selectedSale) {
          this.selectedSale.due_amount = res.sale_due_remaining;
          this.selectedSale.paid_amount = (this.selectedSale.paid_amount || 0) + (res.amount || 0);
          this.loadInvoicePayments(this.selectedSale.id);
        }
        this.loadSummary();
        this.invoicePage = 1;
        this.loadInvoices();
        this.histPage = 1;
        this.loadHistory();
        setTimeout(() => this.successMsg = '', 6000);
      },
      error: (err: any) => {
        this.errorMsg = err?.error?.detail || this.translate.instant('common.error') || 'Error';
        this.paying = false;
      }
    });
  }

  loadHistory(): void {
    this.loadingHistory = true;
    const qs = new URLSearchParams({ page: String(this.histPage), page_size: String(this.histPageSize) }).toString();
    this.api.get(`/payments/invoice?${qs}`).subscribe({
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
