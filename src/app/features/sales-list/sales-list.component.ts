import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { localDateStr } from '../../shared/utils/date.utils';
import { TranslatePipe } from '@ngx-translate/core';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';

@Component({
  selector: 'app-sales-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, PaginatorComponent],
  templateUrl: './sales-list.component.html',
  styleUrls: ['./sales-list.component.css']
})
export class SalesListComponent implements OnInit {

  sales: any[] = [];
  loading = false;

  /* filters */
  filterInvoice = '';
  filterDateFrom = '';
  filterDateTo = '';
  filterStatus = '';           // '' | 'due' | 'paid'

  /* customer autocomplete */
  customerSearch = '';
  selectedCustomer: any = null;
  customerResults: any[] = [];
  showCustomerDrop = false;
  customerTimer: any;

  page = 1;
  pages = 1;
  total = 0;
  pageSize = 20;

  /* inline panel state */
  selectedSale: any = null;
  activePanel: 'payment' | 'return' | null = null;
  successMsg = '';
  errorMsg = '';

  /* payment form */
  payAmount: number | null = null;
  payDiscount: number | null = null;
  payNote = '';
  paying = false;

  /* return form */
  returnItems: { product_id: number; product_name: string; rate: number; max_qty: number; qty: number }[] = [];
  returnReason = '';
  returning = false;

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {
    const today = localDateStr();
    this.filterDateFrom = today;
    this.filterDateTo   = today;
    this.load();
  }

  load() {
    const params: string[] = [`page=${this.page}`, `page_size=${this.pageSize}`];
    if (this.filterInvoice.trim()) params.push(`invoice_no=${encodeURIComponent(this.filterInvoice.trim())}`);
    if (this.selectedCustomer) params.push(`customer_id=${this.selectedCustomer.id}`);
    if (this.filterDateFrom) params.push(`date_from=${this.filterDateFrom}`);
    if (this.filterDateTo)   params.push(`date_to=${this.filterDateTo}`);
    if (this.filterStatus === 'due')  params.push('has_due=true');
    if (this.filterStatus === 'paid') params.push('has_due=false');
    this.loading = true;
    this.api.get(`/sales/?${params.join('&')}`).subscribe({
      next: (res: any) => {
        this.sales = res.data;
        this.total = res.total;
        this.pages = res.pages;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  applyFilter() { this.page = 1; this.closePanel(); this.load(); }

  clearFilter() {
    const today = localDateStr();
    this.filterInvoice = '';
    this.filterDateFrom = today;
    this.filterDateTo   = today;
    this.filterStatus = '';
    this.clearCustomer();
    this.applyFilter();
  }

  setToday() {
    const t = localDateStr();
    this.filterDateFrom = t; this.filterDateTo = t; this.applyFilter();
  }

  setThisWeek() {
    const now = new Date();
    const sun = new Date(now); sun.setDate(now.getDate() - now.getDay());
    this.filterDateFrom = localDateStr(sun);
    this.filterDateTo   = localDateStr(now);
    this.applyFilter();
  }

  setThisMonth() {
    const now = new Date();
    this.filterDateFrom = localDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
    this.filterDateTo   = localDateStr(now);
    this.applyFilter();
  }

  setAllTime() {
    this.filterDateFrom = ''; this.filterDateTo = ''; this.applyFilter();
  }

  onPageChange(p: number) { this.page = p; this.closePanel(); this.load(); }

  /* customer autocomplete */
  onCustomerInput() {
    clearTimeout(this.customerTimer);
    if (!this.customerSearch.trim()) { this.clearCustomer(); return; }
    this.customerTimer = setTimeout(() => {
      const qs = new URLSearchParams({ search: this.customerSearch, page_size: '10' }).toString();
      this.api.get(`/customers/?${qs}`).subscribe({
        next: (res: any) => {
          this.customerResults = res.data ?? res;
          this.showCustomerDrop = this.customerResults.length > 0;
        }, error: () => {}
      });
    }, 280);
  }

  selectCustomer(c: any) {
    this.selectedCustomer = c;
    this.customerSearch = c.name;
    this.showCustomerDrop = false;
    this.customerResults = [];
  }

  clearCustomer() {
    this.selectedCustomer = null;
    this.customerSearch = '';
    this.customerResults = [];
    this.showCustomerDrop = false;
  }

  viewInvoice(sale: any) {
    this.router.navigate(['/invoice', sale.id]);
  }

  /* ── Panel helpers ── */
  openPayment(sale: any) {
    if (this.selectedSale?.id === sale.id && this.activePanel === 'payment') { this.closePanel(); return; }
    this.closePanel();
    this.selectedSale = sale;
    this.activePanel = 'payment';
    this.payAmount = null; this.payDiscount = null; this.payNote = '';
    this.successMsg = ''; this.errorMsg = '';
  }

  openReturn(sale: any) {
    if (this.selectedSale?.id === sale.id && this.activePanel === 'return') { this.closePanel(); return; }
    this.closePanel();
    this.selectedSale = sale;
    this.activePanel = 'return';
    this.returnReason = ''; this.successMsg = ''; this.errorMsg = '';
    this.returnItems = (sale.items || []).map((i: any) => ({
      product_id: i.product_id,
      product_name: i.product_name,
      rate: i.rate,
      max_qty: i.quantity,
      qty: 0
    }));
  }

  closePanel() {
    this.selectedSale = null;
    this.activePanel = null;
    this.returnItems = [];
    this.payAmount = null; this.payDiscount = null; this.payNote = '';
    this.returnReason = '';
  }

  /* ── Payment getters ── */
  get maxDue(): number { return this.selectedSale?.due_amount ?? 0; }
  get totalReduction(): number { return (this.payAmount || 0) + (this.payDiscount || 0); }
  get afterPayment(): number { return Math.max(0, this.maxDue - this.totalReduction); }
  get payValid(): boolean {
    const t = this.totalReduction;
    return t > 0 && t <= this.maxDue + 0.001;
  }
  setFullPay() { this.payAmount = this.maxDue; this.payDiscount = null; }

  submitPayment() {
    if (!this.payValid || !this.selectedSale || this.paying) return;
    this.paying = true; this.errorMsg = '';
    this.api.post('/payments/invoice', {
      sale_id: this.selectedSale.id,
      amount: +(this.payAmount || 0),
      discount_amount: +(this.payDiscount || 0),
      note: this.payNote || null
    }).subscribe({
      next: (res: any) => {
        this.paying = false;
        const parts = [];
        if (this.payAmount) parts.push(`৳${this.payAmount} payment`);
        if (this.payDiscount) parts.push(`৳${this.payDiscount} discount`);
        this.successMsg = `${parts.join(' + ')} recorded. Ref: ${res.reference_no}`;
        // update due in-place
        this.selectedSale.due_amount = res.sale_due_remaining;
        this.selectedSale.paid_amount = (this.selectedSale.paid_amount || 0) + (+(this.payAmount || 0));
        this.payAmount = null; this.payDiscount = null; this.payNote = '';
        // sync in list
        const idx = this.sales.findIndex(s => s.id === this.selectedSale.id);
        if (idx > -1) {
          this.sales[idx].due_amount = res.sale_due_remaining;
          this.sales[idx].paid_amount = this.selectedSale.paid_amount;
        }
        setTimeout(() => { this.successMsg = ''; this.closePanel(); }, 3500);
      },
      error: (err: any) => { this.errorMsg = err?.error?.detail || 'Payment failed.'; this.paying = false; }
    });
  }

  /* ── Return helpers ── */
  get returnTotal(): number {
    return this.returnItems.reduce((s, i) => s + (i.qty > 0 ? i.qty * i.rate : 0), 0);
  }
  get returnValid(): boolean {
    return this.returnItems.some(i => i.qty > 0 && i.qty <= i.max_qty)
      && !this.returnItems.some(i => i.qty < 0 || i.qty > i.max_qty);
  }

  submitReturn() {
    if (!this.returnValid || !this.selectedSale || this.returning) return;
    if (!this.selectedSale.customer_id) {
      this.errorMsg = 'Sale returns are only supported for named customers.'; return;
    }
    this.returning = true; this.errorMsg = '';
    const items = this.returnItems
      .filter(i => i.qty > 0)
      .map(i => ({ product_id: i.product_id, quantity: i.qty, rate: i.rate }));

    this.api.post('/sale-returns/', {
      sale_id: this.selectedSale.id,
      customer_id: this.selectedSale.customer_id,
      reason: this.returnReason || '',
      items
    }).subscribe({
      next: (res: any) => {
        this.returning = false;
        this.successMsg = `Return ${res.return_no} recorded. ৳${res.total_returned} credited.`;
        setTimeout(() => { this.successMsg = ''; this.closePanel(); this.load(); }, 3000);
      },
      error: (err: any) => { this.errorMsg = err?.error?.detail || 'Return failed.'; this.returning = false; }
    });
  }
}
