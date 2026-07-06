import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { TranslatePipe } from '@ngx-translate/core';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { ConfirmService } from '../../shared/services/confirm.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, PaginatorComponent],
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.css']
})
export class CategoriesComponent implements OnInit {
  categories: any[] = [];
  loading = false;

  filterName = '';

  page = 1;
  pages = 1;
  total = 0;
  pageSize = 20;

  showForm = false;
  newCategory: any = { id: 0, name: '' };

  constructor(private api: ApiService, private confirmSvc: ConfirmService, private toast: ToastService) {}

  ngOnInit() { this.load(); }

  load() {
    const params: string[] = [`page=${this.page}`, `page_size=${this.pageSize}`];
    if (this.filterName.trim()) params.push(`name=${encodeURIComponent(this.filterName.trim())}`);

    this.loading = true;
    this.api.get(`/categories/?${params.join('&')}`).subscribe({
      next: (res: any) => {
        if (res.data !== undefined) {
          this.categories = res.data;
          this.total = res.total;
          this.pages = res.pages;
        } else {
          // fallback: endpoint returns plain array
          this.categories = res;
          this.total = res.length;
          this.pages = 1;
        }
        this.loading = false;
      },
      error: (err) => { console.error('Failed to load categories', err); this.loading = false; }
    });
  }

  applyFilter() { this.page = 1; this.load(); }
  clearFilter() { this.filterName = ''; this.applyFilter(); }
  private filterTimer: any;
  onSearchInput() { clearTimeout(this.filterTimer); this.filterTimer = setTimeout(() => this.applyFilter(), 400); }
  onPageChange(p: number) { this.page = p; this.load(); }

  save() { this.newCategory.id > 0 ? this.updateCategory() : this.createCategory(); }

  createCategory() {
    this.api.post('/categories/', this.newCategory).subscribe({
      next: () => { this.load(); this.cancelForm(); },
      error: (err) => console.error('Failed to create category', err)
    });
  }

  openAdd() { this.newCategory = { id: 0, name: '' }; this.showForm = true; }
  cancelForm() { this.newCategory = { id: 0, name: '' }; this.showForm = false; }
  edit(c: any) { this.newCategory = { ...c }; this.showForm = true; }

  updateCategory() {
    this.api.put(`/categories/${this.newCategory.id}`, this.newCategory).subscribe({
      next: () => { this.load(); this.cancelForm(); },
      error: (err) => console.error('Failed to update category', err)
    });
  }

  async delete(id: number) {
    if (!await this.confirmSvc.open('Deactivate this category? Products keep their history.')) return;
    this.api.delete(`/categories/${id}`).subscribe({
      next: () => this.load(),
      error: () => this.toast.error('Failed to delete category.')
    });
  }
}
