import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { TranslatePipe } from '@ngx-translate/core';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, PaginatorComponent],
  templateUrl: './suppliers.component.html',
  styleUrls: ['./suppliers.component.css']
})
export class SuppliersComponent implements OnInit {
  suppliers: any[] = [];
  loading = false;

  filterName = '';

  page = 1;
  pages = 1;
  total = 0;
  pageSize = 20;

  newSupplier = { name: '', phone: '', address: '', opening_due: 0 };

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() { this.load(); }

  load() {
    const params: string[] = [`page=${this.page}`, `page_size=${this.pageSize}`];
    if (this.filterName.trim()) params.push(`name=${encodeURIComponent(this.filterName.trim())}`);

    this.loading = true;
    this.api.get(`/suppliers/?${params.join('&')}`).subscribe({
      next: (res: any) => {
        this.suppliers = res.data;
        this.total = res.total;
        this.pages = res.pages;
        this.loading = false;
      },
      error: (err) => { console.error('Failed to load suppliers', err); this.loading = false; }
    });
  }

  applyFilter() { this.page = 1; this.load(); }
  clearFilter() { this.filterName = ''; this.applyFilter(); }
  onPageChange(p: number) { this.page = p; this.load(); }

  totalDue(): number {
    return this.suppliers.reduce((sum, s) => sum + (s.opening_due || 0), 0);
  }

  save() {
    this.toast.startSaving();
    this.api.post('/suppliers/', this.newSupplier).subscribe({
      next: () => {
        this.toast.stopSaving(); this.toast.success('Supplier Added');
        this.newSupplier = { name: '', phone: '', address: '', opening_due: 0 };
        this.load();
      },
      error: (err) => { this.toast.stopSaving(); this.toast.error('Failed to save supplier'); console.error(err); }
    });
  }
}
