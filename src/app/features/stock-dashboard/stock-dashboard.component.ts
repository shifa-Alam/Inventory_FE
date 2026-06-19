import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';

@Component({
  selector: 'app-stock-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, PaginatorComponent],
  templateUrl: './stock-dashboard.component.html',
  styleUrl: './stock-dashboard.component.css'
})
export class StockDashboardComponent implements OnInit {
  stocks: any[] = [];
  categories: any[] = [];
  loading = false;

  summary = { total_products: 0, total_stock_value: 0, low_stock_count: 0, out_of_stock_count: 0 };

  searchText = '';
  filterCategory = '';
  filterStatus = '';

  page = 1;
  pages = 1;
  total = 0;
  pageSize = 20;

  private searchTimer: any;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadSummary();
    this.loadCategories();
    this.load();
  }

  loadSummary() {
    this.api.get('/reports/stock/summary').subscribe({
      next: (res: any) => { this.summary = res; },
      error: (err) => console.error('Failed to load summary', err)
    });
  }

  loadCategories() {
    this.api.get('/categories/?page=1&page_size=1000').subscribe({
      next: (res: any) => { this.categories = res.data ?? res; },
      error: (err) => console.error('Failed to load categories', err)
    });
  }

  load() {
    this.loading = true;
    let params = `page=${this.page}&page_size=${this.pageSize}`;
    if (this.searchText.trim()) params += `&search=${encodeURIComponent(this.searchText.trim())}`;
    if (this.filterCategory) params += `&category_id=${this.filterCategory}`;
    if (this.filterStatus) params += `&status=${this.filterStatus}`;

    this.api.get(`/reports/stock?${params}`).subscribe({
      next: (res: any) => {
        this.stocks = res.data ?? res;
        this.total = res.total ?? this.stocks.length;
        this.pages = res.pages ?? 1;
        this.loading = false;
      },
      error: (err) => { console.error('Failed to load stock', err); this.loading = false; }
    });
  }

  onSearchChange() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page = 1; this.load(); }, 350);
  }

  onFilterChange() { this.page = 1; this.load(); }

  onPageChange(p: number) { this.page = p; this.load(); }

  clearFilters() {
    this.searchText = '';
    this.filterCategory = '';
    this.filterStatus = '';
    this.page = 1;
    this.load();
  }

  get hasFilters() {
    return this.searchText || this.filterCategory || this.filterStatus;
  }
}
