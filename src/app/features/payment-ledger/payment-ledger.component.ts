import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { localDateStr } from '../../shared/utils/date.utils';
import { TranslatePipe } from '@ngx-translate/core';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';

@Component({
  selector: 'app-payment-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, PaginatorComponent],
  templateUrl: './payment-ledger.component.html',
  styleUrls: ['./payment-ledger.component.css']
})
export class PaymentLedgerComponent implements OnInit {

  /* filters */
  dateFrom = localDateStr();
  dateTo   = localDateStr();
  filterType = '';
  customerSearch = '';
  selectedCustomer: any = null;

  /* customer autocomplete */
  customerResults: any[] = [];
  customerSearchTimer: any;
  showCustomerDropdown = false;

  /* summary */
  summary: any = {
    date: '', sale_payment: 0, due_payment: 0, total_cash_in: 0,
    discount_given: 0, return_amount: 0, net_cash: 0,
    total_outstanding_due: 0,
    counts: { sale_payment: 0, due_payment: 0, discount: 0, return: 0 }
  };
  loadingSummary = false;

  /* ledger */
  entries: any[] = [];
  loading = false;
  page = 1;
  pages = 1;
  total = 0;
  pageSize = 30;

  readonly TYPES = [
    { value: '', key: 'payment_ledger.all_types' },
    { value: 'SALE_PAYMENT', key: 'payment_ledger.type_sale_payment' },
    { value: 'DUE_PAYMENT',  key: 'payment_ledger.type_due_payment' },
    { value: 'DISCOUNT',     key: 'payment_ledger.type_discount' },
    { value: 'RETURN',       key: 'payment_ledger.type_return' },
  ];

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loadSummary();
    this.loadLedger();
  }

  loadSummary(): void {
    this.loadingSummary = true;
    const params: Record<string, any> = {};
    if (this.dateFrom) params['date_from'] = this.dateFrom;
    if (this.dateTo)   params['date_to']   = this.dateTo;
    if (this.selectedCustomer) params['customer_id'] = this.selectedCustomer.id;
    const qs = new URLSearchParams(params).toString();
    this.api.get(`/payment-ledger/summary${qs ? '?' + qs : ''}`).subscribe({
      next: (res: any) => { this.summary = res; this.loadingSummary = false; },
      error: () => { this.loadingSummary = false; }
    });
  }

  loadLedger(): void {
    this.loading = true;
    const params: Record<string, any> = { page: this.page, page_size: this.pageSize };
    if (this.dateFrom) params['date_from'] = this.dateFrom;
    if (this.dateTo)   params['date_to']   = this.dateTo;
    if (this.filterType) params['transaction_type'] = this.filterType;
    if (this.selectedCustomer) params['customer_id'] = this.selectedCustomer.id;
    const qs = new URLSearchParams(params).toString();
    this.api.get(`/payment-ledger/?${qs}`).subscribe({
      next: (res: any) => {
        this.entries = res.data ?? res;
        this.total = res.total ?? this.entries.length;
        this.pages = res.pages ?? 1;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  applyFilter(): void { this.page = 1; this.load(); }

  clearFilter(): void {
    const today = localDateStr();
    this.dateFrom = today;
    this.dateTo   = today;
    this.filterType = '';
    this.customerSearch = '';
    this.selectedCustomer = null;
    this.customerResults = [];
    this.page = 1;
    this.load();
  }

  onPage(p: number): void { this.page = p; this.loadLedger(); }

  /* Customer autocomplete */
  onCustomerInput(): void {
    clearTimeout(this.customerSearchTimer);
    if (!this.customerSearch.trim()) {
      this.selectedCustomer = null;
      this.customerResults = [];
      this.showCustomerDropdown = false;
      return;
    }
    this.customerSearchTimer = setTimeout(() => this.searchCustomers(), 300);
  }

  searchCustomers(): void {
    const qs = new URLSearchParams({ search: this.customerSearch, page_size: '10' }).toString();
    this.api.get(`/customers/?${qs}`).subscribe({
      next: (res: any) => {
        this.customerResults = res.data ?? res;
        this.showCustomerDropdown = this.customerResults.length > 0;
      },
      error: () => {}
    });
  }

  selectCustomer(c: any): void {
    this.selectedCustomer = c;
    this.customerSearch = c.name;
    this.showCustomerDropdown = false;
    this.customerResults = [];
  }

  clearCustomer(): void {
    this.selectedCustomer = null;
    this.customerSearch = '';
    this.customerResults = [];
    this.showCustomerDropdown = false;
  }

  /* Helpers */
  typeLabel(type: string): string {
    const map: Record<string, string> = {
      SALE_PAYMENT: 'payment_ledger.type_sale_payment',
      DUE_PAYMENT:  'payment_ledger.type_due_payment',
      DISCOUNT:     'payment_ledger.type_discount',
      RETURN:       'payment_ledger.type_return',
    };
    return map[type] ?? type;
  }

  typeClass(type: string): string {
    const map: Record<string, string> = {
      SALE_PAYMENT: 'badge-success',
      DUE_PAYMENT:  'badge-primary',
      DISCOUNT:     'badge-warn',
      RETURN:       'badge-danger',
    };
    return map[type] ?? '';
  }

  isNegative(entry: any): boolean { return entry.amount < 0; }
}
