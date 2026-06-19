import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { TranslatePipe } from '@ngx-translate/core';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, PaginatorComponent],
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

  newCustomer = { id: 0, name: '', phone: '', address: '', credit_limit: 0, current_due: 0 };

  constructor(private api: ApiService) {}

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
      error: (err) => { console.error('Failed to load customers', err); this.loading = false; }
    });
  }

  applyFilter() { this.page = 1; this.load(); }
  clearFilter() { this.filterName = ''; this.filterHasDue = ''; this.applyFilter(); }
  onPageChange(p: number) { this.page = p; this.load(); }

  save() { this.newCustomer.id > 0 ? this.updateCustomer() : this.createCustomer(); }

  createCustomer() {
    this.api.post('/customers/', this.newCustomer).subscribe({
      next: () => { alert('Customer Added'); this.load(); this.reset(); },
      error: (err) => console.error('Failed to create customer', err)
    });
  }

  edit(c: any) { this.newCustomer = { ...c }; }

  updateCustomer() {
    const { name, phone, address, credit_limit, current_due } = this.newCustomer;
    this.api.put(`/customers/${this.newCustomer.id}`, { name, phone, address, credit_limit, current_due }).subscribe({
      next: () => { alert('Customer Updated'); this.load(); this.reset(); },
      error: (err) => console.error('Failed to update customer', err)
    });
  }

  delete(id: number) {
    if (confirm('Delete customer?')) {
      this.api.delete(`/customers/${id}`).subscribe({
        next: () => this.load(),
        error: (err) => console.error('Failed to delete customer', err)
      });
    }
  }

  cancel() { this.reset(); }

  totalDue(): number {
    return this.customers.reduce((sum, c) => sum + (c.current_due || 0), 0);
  }

  private reset() {
    this.newCustomer = { id: 0, name: '', phone: '', address: '', credit_limit: 0, current_due: 0 };
  }
}
