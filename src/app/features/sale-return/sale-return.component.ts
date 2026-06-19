import { Component, OnInit, OnDestroy, AfterViewInit, DestroyRef, inject, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Subject, EMPTY } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-sale-return',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './sale-return.component.html',
  styleUrls: ['./sale-return.component.css']
})
export class SaleReturnComponent implements OnInit, AfterViewInit, OnDestroy {
  private destroyRef = inject(DestroyRef);

  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;

  customers: any[] = [];
  returns: any[] = [];
  loadingReturns = false;

  customer_id = 0;
  sale_id: number | null = null;
  reason = '';

  productSearch = '';
  filteredProducts: any[] = [];
  selectedIndex = -1;
  items: any[] = [];

  searchSubject = new Subject<string>();

  scanToast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.searchSubject.pipe(
      debounceTime(300),
      switchMap(v => v ? this.api.get(`/products/search?q=${v}`) : EMPTY),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (res: any) => {
        this.filteredProducts = res.data ?? res;
        this.selectedIndex = this.filteredProducts.length === 1 ? 0 : -1;
      },
      error: (err) => console.error('Product search failed', err)
    });
    this.loadCustomers();
    this.loadReturns();
  }

  ngAfterViewInit() {
    this.searchInputRef.nativeElement.focus();
  }

  ngOnDestroy() {
    clearTimeout(this.toastTimer);
  }

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

  loadReturns() {
    this.loadingReturns = true;
    this.api.get('/sale-returns/').subscribe({
      next: (res: any) => { this.returns = res.data ?? res; this.loadingReturns = false; },
      error: (err) => { console.error('Failed to load returns', err); this.loadingReturns = false; }
    });
  }

  onSearchChange(value: string) {
    this.selectedIndex = -1;
    if (!value || value.length < 2) { this.filteredProducts = []; return; }
    this.searchSubject.next(value);
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (this.filteredProducts.length)
        this.selectedIndex = this.selectedIndex < this.filteredProducts.length - 1 ? this.selectedIndex + 1 : 0;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.filteredProducts.length)
        this.selectedIndex = this.selectedIndex > 0 ? this.selectedIndex - 1 : this.filteredProducts.length - 1;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.filteredProducts.length && this.selectedIndex >= 0) {
        this.selectProduct(this.filteredProducts[this.selectedIndex]);
      } else if (this.productSearch.trim().length >= 2) {
        const code = this.productSearch.trim();
        this.productSearch = '';
        this.filteredProducts = [];
        this.searchSubject.next('');
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
        const list = res.data ?? res;
        if (!list?.length) { this.showToast(`Not found: ${sku}`, 'error'); return; }
        const product = list.find((p: any) => p.sku === sku) ?? list[0];
        this.selectProduct(product);
      },
      error: () => this.showToast(`Not found: ${sku}`, 'error')
    });
  }

  selectProduct(product: any) {
    const existing = this.items.find(i => i.product_id === product.id);
    if (existing) {
      existing.quantity++;
      this.showToast(`${product.name} × ${existing.quantity}`, 'success');
    } else {
      this.items.push({
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        rate: product.sale_price
      });
      this.showToast(`Added: ${product.name}`, 'success');
    }
    this.filteredProducts = [];
    this.productSearch = '';
    this.selectedIndex = -1;
  }

  removeRow(i: number) { this.items.splice(i, 1); }

  getTotal() {
    return this.items.reduce((a, b) => a + (b.quantity * b.rate), 0);
  }

  private showToast(message: string, type: 'success' | 'error') {
    clearTimeout(this.toastTimer);
    this.scanToast = { message, type };
    this.toastTimer = setTimeout(() => { this.scanToast = null; }, 2500);
  }

  save() {
    if (!this.customer_id || +this.customer_id === 0) {
      alert('Please select a customer.');
      return;
    }
    if (!this.sale_id) {
      alert('Please enter the Sale ID to return against.');
      return;
    }
    if (!this.reason.trim()) {
      alert('Please enter a reason for the return.');
      return;
    }
    if (this.items.length === 0) {
      alert('Please add at least one product to return.');
      return;
    }

    const payload = {
      sale_id: +this.sale_id,
      customer_id: +this.customer_id,
      reason: this.reason.trim(),
      items: this.items.map(i => ({
        product_id: +i.product_id,
        quantity: +i.quantity,
        rate: +i.rate
      }))
    };

    this.api.post('/sale-returns/', payload).subscribe({
      next: (res: any) => {
        alert(`Return recorded: ${res.return_no}`);
        this.items = [];
        this.customer_id = 0;
        this.sale_id = null;
        this.reason = '';
        this.loadReturns();
        this.searchInputRef.nativeElement.focus();
      },
      error: (err) => alert(err?.error?.detail || 'Failed to save return')
    });
  }
}
