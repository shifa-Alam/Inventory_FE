import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';

@Component({
  selector: 'app-purchase-history',
  standalone: true,
  imports: [DatePipe, CommonModule, FormsModule, TranslatePipe, PaginatorComponent],
  templateUrl: './purchase-history.component.html',
  styleUrl: './purchase-history.component.css'
})
export class PurchaseHistoryComponent implements OnInit, OnDestroy {
  purchases: any[] = [];
  suppliers: any[] = [];
  loading = false;

  filterSupplierId = 0;
  filterDateFrom = '';
  filterDateTo = '';
  filterInvoice = '';
  activeQuick = 'today';

  page = 1;
  pages = 1;
  total = 0;
  pageSize = 20;

  private filterTimer: any;

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.api.get('/suppliers/').subscribe({
      next: (res: any) => { this.suppliers = res.data ?? res; },
      error: () => {}
    });
    this.setToday();
  }

  ngOnDestroy() { clearTimeout(this.filterTimer); }

  private today() { return new Date().toISOString().slice(0, 10); }

  setToday() {
    const d = this.today();
    this.filterDateFrom = d; this.filterDateTo = d;
    this.activeQuick = 'today'; this.page = 1; this.load();
  }

  setThisWeek() {
    const now = new Date();
    const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    this.filterDateFrom = mon.toISOString().slice(0, 10);
    this.filterDateTo = this.today();
    this.activeQuick = 'week'; this.page = 1; this.load();
  }

  setThisMonth() {
    const now = new Date();
    this.filterDateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    this.filterDateTo = this.today();
    this.activeQuick = 'month'; this.page = 1; this.load();
  }

  setAllTime() {
    this.filterDateFrom = ''; this.filterDateTo = '';
    this.activeQuick = 'all'; this.page = 1; this.load();
  }

  onDateChange() { this.activeQuick = ''; this.applyFilter(); }

  onInvoiceInput() {
    clearTimeout(this.filterTimer);
    this.filterTimer = setTimeout(() => { this.page = 1; this.load(); }, 300);
  }

  load() {
    const params: string[] = [`page=${this.page}`, `page_size=${this.pageSize}`];
    if (+this.filterSupplierId > 0) params.push(`supplier_id=${this.filterSupplierId}`);
    if (this.filterDateFrom) params.push(`date_from=${this.filterDateFrom}`);
    if (this.filterDateTo)   params.push(`date_to=${this.filterDateTo}`);
    if (this.filterInvoice.trim()) params.push(`invoice_no=${encodeURIComponent(this.filterInvoice.trim())}`);

    this.loading = true;
    this.api.get(`/purchases/?${params.join('&')}`).subscribe({
      next: (res: any) => {
        this.purchases = res.data ?? res;
        this.total = res.total ?? this.purchases.length;
        this.pages = res.pages ?? 1;
        this.loading = false;
      },
      error: (err) => { console.error('Failed to load purchases', err); this.loading = false; }
    });
  }

  applyFilter() { this.page = 1; this.load(); }

  clearFilter() {
    this.filterSupplierId = 0; this.filterDateFrom = ''; this.filterDateTo = '';
    this.filterInvoice = ''; this.activeQuick = '';
    this.page = 1; this.load();
  }

  onPageChange(p: number) { this.page = p; this.load(); }

  view(id: number) { this.router.navigate(['/purchase', id]); }
}
