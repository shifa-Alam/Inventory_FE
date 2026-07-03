import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, PaginatorComponent],
  templateUrl: './expenses.component.html',
  styleUrls: ['./expenses.component.css']
})
export class ExpensesComponent implements OnInit {
  expenses: any[] = [];
  loading = false;
  showForm = false;

  // value = backend enum, label = display text
  expenseTypes = [
    { value: 'carrying',    label: 'Carrying Cost' },
    { value: 'delivery',    label: 'Delivery Cost' },
    { value: 'rent',        label: 'Rent' },
    { value: 'utility',     label: 'Utility / Electricity' },
    { value: 'salary',      label: 'Salary' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'marketing',   label: 'Marketing' },
    { value: 'other',       label: 'Other / Miscellaneous' },
  ];

  form: any = { id: 0, category: '', amount: null, date: this.today(), description: '' };

  filterCategory = '';
  filterFrom = '';
  filterTo = '';

  page = 1;
  pages = 1;
  total = 0;
  pageSize = 20;

  summaryTotal = 0;
  summaryByCategory: Record<string, number> = {};

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private confirmSvc: ConfirmService
  ) {}

  ngOnInit() { this.load(); this.loadSummary(); }

  today(): string {
    return new Date().toISOString().split('T')[0];
  }

  load() {
    const params: string[] = [`page=${this.page}`, `page_size=${this.pageSize}`];
    if (this.filterCategory) params.push(`category=${encodeURIComponent(this.filterCategory)}`);
    if (this.filterFrom) params.push(`date_from=${this.filterFrom}`);
    if (this.filterTo) params.push(`date_to=${this.filterTo}`);

    this.loading = true;
    this.api.get(`/expenses/?${params.join('&')}`).subscribe({
      next: (res: any) => {
        this.expenses = res.data ?? res;
        this.total   = res.total  ?? res.length;
        this.pages   = res.pages  ?? 1;
        this.loading = false;
      },
      error: (err) => { console.error('Failed to load expenses', err); this.loading = false; }
    });
  }

  loadSummary() {
    const params: string[] = [];
    if (this.filterFrom) params.push(`date_from=${this.filterFrom}`);
    if (this.filterTo) params.push(`date_to=${this.filterTo}`);
    const qs = params.length ? `?${params.join('&')}` : '';

    this.api.get(`/expenses/summary${qs}`).subscribe({
      next: (res: any) => {
        this.summaryTotal = res.total ?? 0;
        this.summaryByCategory = res.by_category ?? {};
      },
      error: () => {}
    });
  }

  applyFilter() { this.page = 1; this.load(); this.loadSummary(); }

  clearFilter() {
    this.filterCategory = '';
    this.filterFrom = '';
    this.filterTo = '';
    this.applyFilter();
  }

  onPageChange(p: number) { this.page = p; this.load(); }

  openAdd() {
    this.form = { id: 0, category: '', amount: null, date: this.today(), description: '' };
    this.showForm = true;
  }

  edit(expense: any) {
    this.form = {
      id: expense.id,
      category: expense.category,
      amount: expense.amount,
      date: expense.date,
      description: expense.description ?? ''
    };
    this.showForm = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelForm() {
    this.showForm = false;
    this.form = { id: 0, category: '', amount: null, date: this.today(), description: '' };
  }

  save() {
    if (!this.form.category)              { this.toast.warning('Please select an expense type.'); return; }
    if (!this.form.amount || this.form.amount <= 0) { this.toast.warning('Please enter a valid amount.'); return; }
    if (!this.form.date)                  { this.toast.warning('Please select a date.'); return; }

    const payload = {
      category: this.form.category,
      amount: +this.form.amount,
      date: this.form.date,
      description: this.form.description?.trim() || null
    };

    this.toast.startSaving();
    const req = this.form.id > 0
      ? this.api.put(`/expenses/${this.form.id}`, payload)
      : this.api.post('/expenses/', payload);

    req.subscribe({
      next: () => {
        this.toast.stopSaving();
        this.toast.success(this.form.id > 0 ? 'Expense updated.' : 'Expense recorded.');
        this.cancelForm();
        this.load();
        this.loadSummary();
      },
      error: (err: any) => {
        this.toast.stopSaving();
        this.toast.error(err?.error?.detail || 'Failed to save expense.');
      }
    });
  }

  async delete(id: number) {
    if (!await this.confirmSvc.open('Delete this expense? This cannot be undone.', { danger: true })) return;
    this.api.delete(`/expenses/${id}`).subscribe({
      next: () => { this.toast.success('Expense deleted.'); this.load(); this.loadSummary(); },
      error: () => this.toast.error('Failed to delete expense.')
    });
  }

  labelFor(value: string): string {
    return this.expenseTypes.find(t => t.value === value)?.label ?? value;
  }

  badgeClass(category: string): string {
    const map: Record<string, string> = {
      carrying:    'badge-purple',
      delivery:    'badge-blue',
      rent:        'badge-orange',
      utility:     'badge-yellow',
      salary:      'badge-green',
      maintenance: 'badge-teal',
      marketing:   'badge-pink',
      other:       'badge-gray',
    };
    return map[category] ?? 'badge-gray';
  }

  summaryEntries(): { label: string; value: number; cls: string }[] {
    return Object.entries(this.summaryByCategory).map(([k, v]) => ({
      label: this.labelFor(k),
      value: v,
      cls: this.badgeClass(k)
    }));
  }
}
