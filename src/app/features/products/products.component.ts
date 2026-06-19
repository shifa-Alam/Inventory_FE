import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { TranslatePipe } from '@ngx-translate/core';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { ToastService } from '../../shared/services/toast.service';

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

  page = 1;
  pages = 1;
  total = 0;
  pageSize = 20;

  newProduct = { id: 0, name: '', sku: '', category_id: 0, purchase_price: 0, sale_price: 0, current_stock: 0 };

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() {
    this.load();
    this.loadCategories();
  }

  load() {
    const params: string[] = [`page=${this.page}`, `page_size=${this.pageSize}`];
    if (this.filterName.trim()) params.push(`name=${encodeURIComponent(this.filterName.trim())}`);
    if (+this.filterCategoryId > 0) params.push(`category_id=${this.filterCategoryId}`);
    if (this.filterStatus) params.push(`status=${this.filterStatus}`);

    this.loading = true;
    this.api.get(`/products/?${params.join('&')}`).subscribe({
      next: (res: any) => {
        this.products = res.data;
        this.total = res.total;
        this.pages = res.pages;
        this.loading = false;
      },
      error: (err) => { console.error('Failed to load products', err); this.loading = false; }
    });
  }

  loadCategories() {
    this.api.get('/categories/').subscribe({
      next: (res: any) => { this.categories = res.data ?? res; },
      error: (err) => console.error('Failed to load categories', err)
    });
  }

  applyFilter() { this.page = 1; this.load(); }
  clearFilter() { this.filterName = ''; this.filterCategoryId = 0; this.filterStatus = ''; this.applyFilter(); }
  onPageChange(p: number) { this.page = p; this.load(); }

  save() { this.newProduct.id ? this.update() : this.create(); }

  create() {
    this.toast.startSaving();
    this.api.post('/products/', this.newProduct).subscribe({
      next: () => { this.toast.stopSaving(); this.toast.success('Product Added'); this.load(); this.reset(); },
      error: (err) => { this.toast.stopSaving(); this.toast.error('Failed to create product'); console.error(err); }
    });
  }

  update() {
    const { name, sku, category_id, purchase_price, sale_price } = this.newProduct;
    this.toast.startSaving();
    this.api.put(`/products/${this.newProduct.id}`, { name, sku, category_id, purchase_price, sale_price }).subscribe({
      next: () => { this.toast.stopSaving(); this.toast.success('Product Updated'); this.load(); this.reset(); },
      error: (err) => { this.toast.stopSaving(); this.toast.error('Failed to update product'); console.error(err); }
    });
  }

  edit(item: any) { this.newProduct = { ...item }; }

  delete(id: number) {
    if (confirm('Delete this product?')) {
      this.api.delete(`/products/${id}`).subscribe({
        next: () => this.load(),
        error: (err) => console.error('Failed to delete product', err)
      });
    }
  }

  reset() {
    this.newProduct = { id: 0, name: '', sku: '', category_id: 0, purchase_price: 0, sale_price: 0, current_stock: 0 };
  }
}
