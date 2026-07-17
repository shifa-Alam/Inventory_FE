import { Component, HostListener, OnInit } from '@angular/core';
import { AutofocusDirective } from '../../shared/directives/autofocus.directive';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { TranslatePipe } from '@ngx-translate/core';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, PaginatorComponent, AutofocusDirective],
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.css']
})
export class CustomersComponent implements OnInit {
  customers: any[] = [];
  loading = false;

  filterName = '';
  filterHasDue = '';   // '' | 'true' | 'false'

  page = 1;
  pages = 1;
  total = 0;
  pageSize = 20;

  showForm = false;

  /** Esc closes the open form modal — standard desktop expectation. */
  @HostListener('document:keydown.escape')
  onEscape() { if (this.showForm) this.cancelForm(); }
  newCustomer = { id: 0, name: '', phone: '', address: '', credit_limit: 0, current_due: 0 };

  constructor(private api: ApiService, private toast: ToastService, private confirmSvc: ConfirmService) {}

  ngOnInit() { this.load(); }

  load() {
    const params: string[] = [`page=${this.page}`, `page_size=${this.pageSize}`];
    if (this.filterName.trim()) params.push(`name=${encodeURIComponent(this.filterName.trim())}`);
    if (this.filterHasDue !== '') params.push(`has_due=${this.filterHasDue}`);

    this.loading = true;
    this.api.get(`/customers/?${params.join('&')}`).subscribe({
      next: (res: any) => {
        this.customers = res.data;
        this.total = res.total;
        this.pages = res.pages;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  applyFilter() { this.page = 1; this.load(); }
  clearFilter() { this.filterName = ''; this.filterHasDue = ''; this.applyFilter(); }
  private filterTimer: any;
  onSearchInput() { clearTimeout(this.filterTimer); this.filterTimer = setTimeout(() => this.applyFilter(), 400); }
  onPageChange(p: number) { this.page = p; this.load(); }

  save() { this.newCustomer.id > 0 ? this.updateCustomer() : this.createCustomer(); }

  openAdd() { this.resetFields(); this.showForm = true; }
  cancelForm() { this.resetFields(); this.showForm = false; }

  createCustomer() {
    this.toast.startSaving();
    this.api.post('/customers/', this.newCustomer).subscribe({
      next: () => { this.toast.stopSaving(); this.toast.success('Customer Added'); this.load(); this.cancelForm(); },
      error: () => { this.toast.stopSaving(); this.toast.error('Failed to create customer'); }
    });
  }

  edit(c: any) { this.newCustomer = { ...c }; this.showForm = true; }

  updateCustomer() {
    const { name, phone, address, credit_limit, current_due } = this.newCustomer;
    this.toast.startSaving();
    this.api.put(`/customers/${this.newCustomer.id}`, { name, phone, address, credit_limit, current_due }).subscribe({
      next: () => { this.toast.stopSaving(); this.toast.success('Customer Updated'); this.load(); this.cancelForm(); },
      error: () => { this.toast.stopSaving(); this.toast.error('Failed to update customer'); }
    });
  }

  async delete(id: number) {
    if (!await this.confirmSvc.open('Deactivate this customer? Their purchase history is kept.')) return;
    this.api.delete(`/customers/${id}`).subscribe({
      next: () => this.load(),
      error: () => this.toast.error('Failed to delete customer.')
    });
  }

  cancel() { this.cancelForm(); }

  totalDue(): number {
    return this.customers.reduce((sum, c) => sum + (c.current_due || 0), 0);
  }

  private resetFields() {
    this.newCustomer = { id: 0, name: '', phone: '', address: '', credit_limit: 0, current_due: 0 };
  }

  private reset() { this.cancelForm(); }
}
