import { Component, HostListener, OnInit } from '@angular/core';
import { AutofocusDirective } from '../../shared/directives/autofocus.directive';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { TranslatePipe } from '@ngx-translate/core';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, PaginatorComponent, AutofocusDirective],
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

  showForm = false;

  /** Esc closes the open form modal — standard desktop expectation. */
  @HostListener('document:keydown.escape')
  onEscape() { if (this.showForm) this.cancelForm(); }
  newSupplier = { id: 0, name: '', phone: '', address: '', opening_due: 0 };

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
      error: () => { this.loading = false; }
    });
  }

  applyFilter() { this.page = 1; this.load(); }
  clearFilter() { this.filterName = ''; this.applyFilter(); }
  private filterTimer: any;
  onSearchInput() { clearTimeout(this.filterTimer); this.filterTimer = setTimeout(() => this.applyFilter(), 400); }
  onPageChange(p: number) { this.page = p; this.load(); }

  totalDue(): number {
    return this.suppliers.reduce((sum, s) => sum + (s.opening_due || 0), 0);
  }

  openAdd() { this.newSupplier = { id: 0, name: '', phone: '', address: '', opening_due: 0 }; this.showForm = true; }
  cancelForm() { this.newSupplier = { id: 0, name: '', phone: '', address: '', opening_due: 0 }; this.showForm = false; }
  edit(s: any) { this.newSupplier = { ...s }; this.showForm = true; }

  save() {
    this.toast.startSaving();
    const req = this.newSupplier.id
      ? this.api.put(`/suppliers/${this.newSupplier.id}`, this.newSupplier)
      : this.api.post('/suppliers/', this.newSupplier);
    req.subscribe({
      next: () => {
        this.toast.stopSaving();
        this.toast.success(this.newSupplier.id ? 'Supplier Updated' : 'Supplier Added');
        this.cancelForm();
        this.load();
      },
      error: () => { this.toast.stopSaving(); this.toast.error('Failed to save supplier'); }
    });
  }
}
