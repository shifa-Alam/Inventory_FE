import { Component, OnInit } from '@angular/core';
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
export class PurchaseHistoryComponent implements OnInit {
  purchases: any[] = [];
  suppliers: any[] = [];
  loading = false;

  filterSupplierId = 0;
  filterDateFrom = '';
  filterDateTo = '';

  page = 1;
  pages = 1;
  total = 0;
  pageSize = 20;

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.load();
    this.api.get('/suppliers/').subscribe({
      next: (res: any) => { this.suppliers = res.data ?? res; },
      error: () => {}
    });
  }

  load() {
    const params: string[] = [`page=${this.page}`, `page_size=${this.pageSize}`];
    if (+this.filterSupplierId > 0) params.push(`supplier_id=${this.filterSupplierId}`);
    if (this.filterDateFrom) params.push(`date_from=${this.filterDateFrom}`);
    if (this.filterDateTo) params.push(`date_to=${this.filterDateTo}`);

    this.loading = true;
    this.api.get(`/purchases/?${params.join('&')}`).subscribe({
      next: (res: any) => {
        this.purchases = res.data;
        this.total = res.total;
        this.pages = res.pages;
        this.loading = false;
      },
      error: (err) => { console.error('Failed to load purchases', err); this.loading = false; }
    });
  }

  applyFilter() { this.page = 1; this.load(); }
  clearFilter() { this.filterSupplierId = 0; this.filterDateFrom = ''; this.filterDateTo = ''; this.applyFilter(); }
  onPageChange(p: number) { this.page = p; this.load(); }

  view(id: number) { this.router.navigate(['/purchase', id]); }
}
