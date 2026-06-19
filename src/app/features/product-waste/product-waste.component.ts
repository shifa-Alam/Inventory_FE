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
  selector: 'app-product-waste',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './product-waste.component.html',
  styleUrls: ['./product-waste.component.css']
})
export class ProductWasteComponent implements OnInit, AfterViewInit, OnDestroy {
  private destroyRef = inject(DestroyRef);

  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;

  wastes: any[] = [];
  loadingWastes = false;

  selectedProduct: any = null;
  productSearch = '';
  filteredProducts: any[] = [];
  selectedIndex = -1;

  quantity = 1;
  reason = '';

  searchSubject = new Subject<string>();

  scanToast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any;

  constructor(private api: ApiService, private toast: ToastService) {}

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
    this.loadWastes();
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

  loadWastes() {
    this.loadingWastes = true;
    this.api.get('/product-wastes/').subscribe({
      next: (res: any) => { this.wastes = res.data ?? res; this.loadingWastes = false; },
      error: (err) => { console.error('Failed to load wastes', err); this.loadingWastes = false; }
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
        if (!res?.length) { this.showToast(`Not found: ${sku}`, 'error'); return; }
        const product = res.find((p: any) => p.sku === sku) ?? res[0];
        this.selectProduct(product);
      },
      error: () => this.showToast(`Not found: ${sku}`, 'error')
    });
  }

  selectProduct(product: any) {
    this.selectedProduct = product;
    this.productSearch = product.name;
    this.filteredProducts = [];
    this.selectedIndex = -1;
    this.quantity = 1;
    this.showToast(`Selected: ${product.name}`, 'success');
  }

  clearProduct() {
    this.selectedProduct = null;
    this.productSearch = '';
    this.quantity = 1;
    this.searchInputRef.nativeElement.focus();
  }

  private showToast(message: string, type: 'success' | 'error') {
    clearTimeout(this.toastTimer);
    this.scanToast = { message, type };
    this.toastTimer = setTimeout(() => { this.scanToast = null; }, 2500);
  }

  save() {
    if (!this.selectedProduct) {
      this.toast.warning('Please search and select a product.');
      return;
    }
    if (!this.quantity || this.quantity < 1) {
      this.toast.warning('Quantity must be at least 1.');
      return;
    }
    if (this.quantity > this.selectedProduct.current_stock) {
      this.toast.error(`Not enough stock. Available: ${this.selectedProduct.current_stock}`);
      return;
    }
    if (!this.reason.trim()) {
      this.toast.warning('Please enter a reason for the waste.');
      return;
    }

    const payload = {
      product_id: this.selectedProduct.id,
      quantity: +this.quantity,
      reason: this.reason.trim()
    };

    this.toast.startSaving();
    this.api.post('/product-wastes/', payload).subscribe({
      next: (res: any) => {
        this.toast.stopSaving();
        this.toast.success(`Waste recorded: ${res.waste_no}. Remaining stock: ${res.remaining_stock}`);
        this.clearProduct();
        this.reason = '';
        this.quantity = 1;
        this.loadWastes();
      },
      error: (err) => { this.toast.stopSaving(); this.toast.error(err?.error?.detail || 'Failed to save waste record'); }
    });
  }
}
