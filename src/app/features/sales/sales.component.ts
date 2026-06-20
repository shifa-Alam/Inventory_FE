import { Component, OnInit, OnDestroy, AfterViewInit, DestroyRef, inject, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../shared/services/toast.service';
import { Subject, EMPTY } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.css']
})
export class SalesComponent implements OnInit, AfterViewInit, OnDestroy {
  private destroyRef = inject(DestroyRef);

  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;

  customers: any[] = [];
  customer_id: number = 0;
  paid_amount: number = 0;
  discount: number = 0;

  productSearch = '';
  filteredProducts: any[] = [];
  selectedIndex = -1;
  items: any[] = [];

  searchSubject = new Subject<string>();

  scanToast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any;

  constructor(private api: ApiService, private toast: ToastService) { }

  ngOnInit() {
    this.searchSubject.pipe(
      debounceTime(300),
      switchMap(v => v ? this.api.get(`/products/search?q=${v}`) : EMPTY),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (res: any) => {
        this.filteredProducts = res;
        this.selectedIndex = this.filteredProducts.length === 1 ? 0 : -1;
      },
      error: (err) => console.error('Product search failed', err)
    });
    this.loadCustomers();
  }

  ngAfterViewInit() {
    // Auto-focus so scanner input lands here immediately
    this.searchInputRef.nativeElement.focus();
  }

  ngOnDestroy() {
    clearTimeout(this.toastTimer);
  }

  // Redirect any keypress to the search box when no input is focused
  @HostListener('document:keydown', ['$event'])
  onGlobalKey(event: KeyboardEvent) {
    const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
    const isInputFocused = tag === 'input' || tag === 'select' || tag === 'textarea';
    if (!isInputFocused && event.key.length === 1) {
      this.searchInputRef.nativeElement.focus();
    }
  }

  loadCustomers() {
    this.api.get('/customers/?page=1&page_size=1000').subscribe({
      next: (res: any) => { this.customers = res.data ?? res; },
      error: (err) => console.error('Failed to load customers', err)
    });
  }

  onSearchChange(value: string) {
    this.selectedIndex = -1;
    if (!value || value.length < 2) {
      this.filteredProducts = [];
      return;
    }
    this.searchSubject.next(value);
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (this.filteredProducts.length) {
        this.selectedIndex = this.selectedIndex < this.filteredProducts.length - 1
          ? this.selectedIndex + 1 : 0;
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.filteredProducts.length) {
        this.selectedIndex = this.selectedIndex > 0
          ? this.selectedIndex - 1 : this.filteredProducts.length - 1;
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.filteredProducts.length && this.selectedIndex >= 0) {
        // Manual selection from dropdown
        this.selectProduct(this.filteredProducts[this.selectedIndex]);
      } else if (this.productSearch.trim().length >= 2) {
        // Barcode scanner: immediate lookup, bypass debounce
        const code = this.productSearch.trim();
        this.productSearch = '';
        this.filteredProducts = [];
        this.searchSubject.next(''); // cancel any pending debounced search
        this.lookupBarcode(code);
      }
    } else if (event.key === 'Escape') {
      this.filteredProducts = [];
      this.productSearch = '';
    }
  }

  private lookupBarcode(sku: string) {
    this.api.get(`/products/search?q=${encodeURIComponent(sku)}`).subscribe({
      next: (res: any) => {
        if (!res?.length) {
          this.showToast(`Not found: ${sku}`, 'error');
          return;
        }
        const product = res.find((p: any) => p.sku === sku) ?? res[0];
        this.addOrIncrement(product);
      },
      error: () => this.showToast(`Not found: ${sku}`, 'error')
    });
  }

  private addOrIncrement(product: any) {
    if (product.current_stock <= 0) {
      this.showToast(`Out of stock: ${product.name}`, 'error');
      return;
    }
    const existing = this.items.find(i => i.product_id === product.id);
    if (existing) {
      if (existing.quantity >= product.current_stock) {
        this.showToast(`Max stock reached: ${product.name} (${product.current_stock})`, 'error');
        return;
      }
      existing.quantity++;
      this.showToast(`${product.name} × ${existing.quantity}`, 'success');
    } else {
      this.items.push({
        product_id: product.id,
        product_name: product.name,
        stock: product.current_stock,
        quantity: 1,
        rate: product.sale_price
      });
      this.showToast(`Added: ${product.name}`, 'success');
    }
  }

  clampQuantity(item: any) {
    if (item.quantity < 1) item.quantity = 1;
    if (item.quantity > item.stock) {
      item.quantity = item.stock;
      this.showToast(`Max stock for "${item.product_name}" is ${item.stock}`, 'error');
    }
  }

  private showToast(message: string, type: 'success' | 'error') {
    clearTimeout(this.toastTimer);
    this.scanToast = { message, type };
    this.toastTimer = setTimeout(() => { this.scanToast = null; }, 2500);
  }

  selectProduct(product: any) {
    if (product.current_stock <= 0) {
      this.toast.error(`"${product.name}" is out of stock.`);
      return;
    }
    if (this.items.find(i => i.product_id === product.id)) {
      this.toast.warning('Product already added!');
      this.filteredProducts = [];
      this.productSearch = '';
      this.selectedIndex = -1;
      return;
    }
    this.items.push({
      product_id: product.id,
      product_name: product.name,
      stock: product.current_stock,
      quantity: 1,
      rate: product.sale_price
    });
    this.filteredProducts = [];
    this.productSearch = '';
    this.selectedIndex = -1;
  }

  removeRow(i: number) { this.items.splice(i, 1); }

  getTotal(): number {
    return this.items.reduce((sum, i) => sum + (i.quantity * i.rate), 0);
  }

  submit() {
    const custId = +this.customer_id;
    const payload = {
      customer_id: custId > 0 ? custId : null,
      paid_amount: +this.paid_amount,
      discount: +this.discount,
      items: this.items.map(i => ({
        product_id: +i.product_id,
        quantity: +i.quantity,
        rate: +i.rate
      }))
    };
    this.toast.startSaving();
    this.api.post('/sales/', payload).subscribe({
      next: () => {
        this.toast.stopSaving(); this.toast.success('Sale Completed Successfully');
        this.customer_id = 0;
        this.paid_amount = 0;
        this.discount = 0;
        this.items = [];
        this.searchInputRef.nativeElement.focus();
      },
      error: (err) => { this.toast.stopSaving(); this.toast.error('Failed to submit sale'); console.error(err); }
    });
  }
}
