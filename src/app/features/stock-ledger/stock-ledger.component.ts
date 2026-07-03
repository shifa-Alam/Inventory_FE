import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { localDateStr } from '../../shared/utils/date.utils';
import { TranslatePipe } from '@ngx-translate/core';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';

@Component({
  selector: 'app-stock-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, PaginatorComponent],
  templateUrl: './stock-ledger.component.html',
  styleUrls: ['./stock-ledger.component.css']
})
export class StockLedgerComponent implements OnInit {
  transactions: any[] = [];
  loading = false;

  filterType = '';
  filterDateFrom = '';
  filterDateTo = '';
  activeQuick = 'today';

  page = 1;
  pages = 1;
  total = 0;
  pageSize = 20;

  constructor(private api: ApiService) {}

  ngOnInit() {
    const d = localDateStr();
    this.filterDateFrom = d;
    this.filterDateTo = d;
    this.activeQuick = 'today';
    this.load();
  }

  load() {
    const params: string[] = [`page=${this.page}`, `page_size=${this.pageSize}`];
    if (this.filterType) params.push(`transaction_type=${this.filterType}`);
    if (this.filterDateFrom) params.push(`date_from=${this.filterDateFrom}`);
    if (this.filterDateTo) params.push(`date_to=${this.filterDateTo}`);

    this.loading = true;
    this.api.get(`/stock-transactions/?${params.join('&')}`).subscribe({
      next: (res: any) => {
        this.transactions = res.data;
        this.total = res.total;
        this.pages = res.pages;
        this.loading = false;
      },
      error: (err) => { console.error('Failed to load transactions', err); this.loading = false; }
    });
  }

  applyFilter() { this.page = 1; this.load(); }
  onDateChange() { this.activeQuick = ''; this.applyFilter(); }
  onFilterChange() { this.applyFilter(); }
  onPageChange(p: number) { this.page = p; this.load(); }

  setToday() {
    const d = localDateStr();
    this.filterDateFrom = d; this.filterDateTo = d; this.activeQuick = 'today'; this.applyFilter();
  }

  setThisWeek() {
    const now = new Date();
    const daysToMon = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const mon = new Date(now); mon.setDate(now.getDate() - daysToMon);
    this.filterDateFrom = localDateStr(mon); this.filterDateTo = localDateStr(now);
    this.activeQuick = 'week'; this.applyFilter();
  }

  setThisMonth() {
    const now = new Date();
    this.filterDateFrom = localDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
    this.filterDateTo = localDateStr(now); this.activeQuick = 'month'; this.applyFilter();
  }

  setAllTime() {
    this.filterDateFrom = ''; this.filterDateTo = ''; this.activeQuick = 'all'; this.applyFilter();
  }

  clearFilter() {
    this.filterType = '';
    const d = localDateStr();
    this.filterDateFrom = d; this.filterDateTo = d; this.activeQuick = 'today';
    this.applyFilter();
  }

  typeClass(type: string) {
    const map: any = { PURCHASE: 'type-purchase', SALE: 'type-sale', RETURN: 'type-return', WASTE: 'type-waste' };
    return map[type] ?? '';
  }

  directionSign(type: string) { return (type === 'PURCHASE' || type === 'RETURN') ? '+' : '−'; }
  directionClass(type: string) { return (type === 'PURCHASE' || type === 'RETURN') ? 'dir-in' : 'dir-out'; }

  countByType(type: string) { return this.transactions.filter(t => t.transaction_type === type).length; }
}
