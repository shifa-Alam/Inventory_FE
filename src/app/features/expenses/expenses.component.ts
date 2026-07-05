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
  categories: any[] = [];
  loading = false;
  showForm = false;

  // inline "add new category" state
  showNewCategory = false;
  newCategoryName = '';

  form: any = { id: 0, category_id: 0, amount: null, date: this.today(), description: '' };

  filterCategoryId = 0;
  filterFrom = '';
  filterTo = '';

  page = 1;
  pages = 1;
  total = 0;
  pageSize = 20;

  summaryTotal = 0;
  summaryByCategory: Record<string, number> = {};

  private badgePalette = ['badge-purple', 'badge-blue', 'badge-orange', 'badge-yellow',
                          'badge-green', 'badge-teal', 'badge-pink', 'badge-gray'];

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private confirmSvc: ConfirmService
  ) {}

  ngOnInit() { this.loadCategories(); this.load(); this.loadSummary(); }

  today(): string {
    return new Date().toISOString().split('T')[0];
  }

  loadCategories() {
    this.api.get('/expense-categories/').subscribe({
      next: (res: any) => { this.categories = res ?? []; },
      error: (err) => console.error('Failed to load expense categories', err)
    });
  }

  load() {
    const params: string[] = [`page=${this.page}`, `page_size=${this.pageSize}`];
    if (+this.filterCategoryId > 0) params.push(`category_id=${this.filterCategoryId}`);
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
    this.filterCategoryId = 0;
    this.filterFrom = '';
    this.filterTo = '';
    this.applyFilter();
  }

  onPageChange(p: number) { this.page = p; this.load(); }

  openAdd() {
    this.form = { id: 0, category_id: 0, amount: null, date: this.today(), description: '' };
    this.showForm = true;
  }

  edit(expense: any) {
    this.form = {
      id: expense.id,
      category_id: expense.category_id,
      amount: expense.amount,
      date: expense.date,
      description: expense.description ?? ''
    };
    this.showForm = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelForm() {
    this.showForm = false;
    this.showNewCategory = false;
    this.newCategoryName = '';
    this.form = { id: 0, category_id: 0, amount: null, date: this.today(), description: '' };
  }

  addCategory() {
    const name = this.newCategoryName.trim();
    if (!name) { this.toast.warning('Please enter a category name.'); return; }
    this.api.post('/expense-categories/', { name }).subscribe({
      next: (res: any) => {
        this.toast.success('Category added.');
        this.showNewCategory = false;
        this.newCategoryName = '';
        this.loadCategories();
        this.form.category_id = res.id;
      },
      error: (err: any) => this.toast.error(err?.error?.detail || 'Failed to add category.')
    });
  }

  save() {
    if (!+this.form.category_id)          { this.toast.warning('Please select an expense type.'); return; }
    if (!this.form.amount || this.form.amount <= 0) { this.toast.warning('Please enter a valid amount.'); return; }
    if (!this.form.date)                  { this.toast.warning('Please select a date.'); return; }

    const payload = {
      category_id: +this.form.category_id,
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

  badgeClass(categoryName: string): string {
    if (!categoryName) return 'badge-gray';
    let hash = 0;
    for (let i = 0; i < categoryName.length; i++) hash = (hash * 31 + categoryName.charCodeAt(i)) | 0;
    return this.badgePalette[Math.abs(hash) % this.badgePalette.length];
  }

  summaryEntries(): { label: string; value: number; cls: string }[] {
    return Object.entries(this.summaryByCategory).map(([k, v]) => ({
      label: k,
      value: v,
      cls: this.badgeClass(k)
    }));
  }
}
