import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { TranslatePipe } from '@ngx-translate/core';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, PaginatorComponent],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css']
})
export class ProductsComponent implements OnInit {
  products: any[] = [];
  categories: any[] = [];
  loading = false;

  filterName = '';
  filterCategoryId = 0;
  filterStatus = '';
  filterActive = '';
  private filterTimer: any;

  page = 1;
  pages = 1;
  total = 0;
  pageSize = 20;

  showForm = false;
  newProduct = { id: 0, name: '', sku: '', category_id: 0, average_cost: 0, sale_price: 0, mrp: 0, minimum_stock: 0, current_stock: 0 };

  constructor(private api: ApiService, private toast: ToastService, private confirmSvc: ConfirmService) {}

  ngOnInit() {
    this.load();
    this.loadCategories();
  }

  load() {
    const params: string[] = [`page=${this.page}`, `page_size=${this.pageSize}`];
    if (this.filterName.trim()) params.push(`name=${encodeURIComponent(this.filterName.trim())}`);
    if (+this.filterCategoryId > 0) params.push(`category_id=${this.filterCategoryId}`);
    if (this.filterStatus) params.push(`status=${this.filterStatus}`);
    if (this.filterActive !== '') params.push(`is_active=${this.filterActive}`);

    this.loading = true;
    this.api.get(`/products/?${params.join('&')}`).subscribe({
      next: (res: any) => {
        this.products = res.data;
        this.total = res.total;
        this.pages = res.pages;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  loadCategories() {
    this.api.get('/categories/').subscribe({
      next: (res: any) => { this.categories = res.data ?? res; },
      error: () => {}
    });
  }

  applyFilter() { this.page = 1; this.load(); }
  onSearchInput() { clearTimeout(this.filterTimer); this.filterTimer = setTimeout(() => this.applyFilter(), 400); }
  clearFilter() { this.filterName = ''; this.filterCategoryId = 0; this.filterStatus = ''; this.filterActive = ''; this.applyFilter(); }
  onPageChange(p: number) { this.page = p; this.load(); }

  save() { this.newProduct.id ? this.update() : this.create(); }

  create() {
    this.toast.startSaving();
    this.api.post('/products/', this.newProduct).subscribe({
      next: () => { this.toast.stopSaving(); this.toast.success('Product Added'); this.load(); this.reset(); },
      error: () => { this.toast.stopSaving(); this.toast.error('Failed to create product'); }
    });
  }

  update() {
    const { name, sku, category_id, average_cost, sale_price, mrp, minimum_stock } = this.newProduct;
    this.toast.startSaving();
    this.api.put(`/products/${this.newProduct.id}`, { name, sku, category_id, average_cost, sale_price, mrp, minimum_stock }).subscribe({
      next: () => { this.toast.stopSaving(); this.toast.success('Product Updated'); this.load(); this.reset(); },
      error: () => { this.toast.stopSaving(); this.toast.error('Failed to update product'); }
    });
  }

  openAdd() { this.resetFields(); this.showForm = true; }
  cancelForm() { this.resetFields(); this.showForm = false; }
  edit(item: any) { this.newProduct = { ...item }; this.showForm = true; }

  toggleActive(p: any) {
    this.api.patch(`/products/${p.id}/toggle-active`, {}).subscribe({
      next: (res: any) => { p.is_active = res.is_active; },
      error: () => this.toast.error('Failed to update product status')
    });
  }

  async delete(id: number) {
    if (!await this.confirmSvc.open('Deactivate this product? It will be hidden and cannot be sold, but its history is kept.')) return;
    this.api.delete(`/products/${id}`).subscribe({
      next: () => this.load(),
      error: () => this.toast.error('Failed to delete product.')
    });
  }

  resetFields() {
    this.newProduct = { id: 0, name: '', sku: '', category_id: 0, average_cost: 0, sale_price: 0, mrp: 0, minimum_stock: 0, current_stock: 0 };
  }

  reset() { this.cancelForm(); }
}
