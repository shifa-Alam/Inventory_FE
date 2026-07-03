import { Component, OnInit, OnDestroy, AfterViewInit, DestroyRef, inject, HostListener, ViewChild, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../shared/services/toast.service';
import { Subject, EMPTY } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';

interface WasteItem {
  product_id: number;
  product_name: string;
  current_stock: number;
  sku: string;
  quantity: number;
  reason: string;
}

@Component({
  selector: 'app-product-waste',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, PaginatorComponent],
  templateUrl: './product-waste.component.html',
  styleUrls: ['./product-waste.component.css']
})
export class ProductWasteComponent implements OnInit, AfterViewInit, OnDestroy {
  private destroyRef = inject(DestroyRef);

  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('productFilterInput') productFilterInputRef!: ElementRef<HTMLInputElement>;
  @ViewChildren('qtyInput') qtyInputs!: QueryList<ElementRef<HTMLInputElement>>;

  wastes: any[] = [];
  loadingWastes = false;
  historyTotal = 0;
  page = 1;
  pages = 1;
  pageSize = 20;

  // History filters
  filterDateFrom = '';
  filterDateTo = '';
  filterWasteNo = '';
  filterProduct = '';
  filterProductId: number | null = null;
  filterProductSearching = false;
  activeQuick = 'today';

  private today() { return new Date().toISOString().slice(0, 10); }

  productSearch = '';
  filteredProducts: any[] = [];
  selectedIndex = -1;
  searching = false;

  wasteItems: WasteItem[] = [];

  saving = false;

  searchSubject = new Subject<string>();

  scanToast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any;
  private scanInProgress = false;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() {
    this.searchSubject.pipe(
      debounceTime(300),
      switchMap(v => v ? this.api.get(`/products/search?q=${v}`) : EMPTY),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (res: any) => {
        if (this.scanInProgress) return;
        this.filteredProducts = res.data ?? res;
        this.selectedIndex = this.filteredProducts.length === 1 ? 0 : -1;
        this.searching = false;
      },
      error: (err) => { if (!this.scanInProgress) this.searching = false; console.error('Product search failed', err); }
    });
    this.filterDateFrom = this.today();
    this.filterDateTo = this.today();
    this.activeQuick = 'today';
    this.loadWastes();
  }

  ngAfterViewInit() {
    this.searchInputRef.nativeElement.focus();
  }

  ngOnDestroy() {
    clearTimeout(this.toastTimer);
    clearTimeout(this.filterTimer);
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
    const params: string[] = [`page=${this.page}`, `page_size=${this.pageSize}`];
    if (this.filterDateFrom) params.push(`date_from=${this.filterDateFrom}`);
    if (this.filterDateTo)   params.push(`date_to=${this.filterDateTo}`);
    if (this.filterWasteNo.trim()) params.push(`waste_no=${encodeURIComponent(this.filterWasteNo.trim())}`);
    if (this.filterProductId !== null) params.push(`product_id=${this.filterProductId}`);
    else if (this.filterProduct.trim()) params.push(`q=${encodeURIComponent(this.filterProduct.trim())}`);
    this.api.get(`/product-wastes/?${params.join('&')}`).subscribe({
      next: (res: any) => {
        this.wastes = res.data ?? res;
        this.historyTotal = res.total ?? this.wastes.length;
        this.pages = res.pages ?? 1;
        this.loadingWastes = false;
      },
      error: (err) => { console.error('Failed to load wastes', err); this.loadingWastes = false; }
    });
  }

  private filterTimer: any;
  applyFilter() {
    this.page = 1;
    clearTimeout(this.filterTimer);
    this.filterTimer = setTimeout(() => this.loadWastes(), 300);
  }

  onPageChange(p: number) { this.page = p; this.loadWastes(); }

  clearFilter() {
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.filterWasteNo = '';
    this.filterProduct = '';
    this.filterProductId = null;
    this.activeQuick = '';
    this.page = 1;
    this.loadWastes();
  }

  onProductFilterChange() {
    this.filterProductId = null;
    this.applyFilter();
  }

  onProductFilterKey(event: KeyboardEvent) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const sku = this.filterProduct.trim();
    if (!sku) return;
    this.filterProductSearching = true;
    this.api.get(`/products/search?q=${encodeURIComponent(sku)}`).subscribe({
      next: (res: any) => {
        this.filterProductSearching = false;
        const results: any[] = res.data ?? res;
        const match = results.find((p: any) => p.sku === sku) ?? results[0];
        if (match) {
          this.filterProduct = match.name;
          this.filterProductId = match.id;
        }
        this.page = 1;
        this.loadWastes();
      },
      error: () => {
        this.filterProductSearching = false;
        this.page = 1;
        this.loadWastes();
      }
    });
  }

  setToday() {
    const d = this.today();
    this.filterDateFrom = d; this.filterDateTo = d; this.activeQuick = 'today'; this.page = 1; this.loadWastes();
  }

  setThisWeek() {
    const now = new Date();
    const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    this.filterDateFrom = mon.toISOString().slice(0, 10);
    this.filterDateTo = this.today();
    this.activeQuick = 'week'; this.page = 1; this.loadWastes();
  }

  setThisMonth() {
    const now = new Date();
    this.filterDateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    this.filterDateTo = this.today();
    this.activeQuick = 'month'; this.page = 1; this.loadWastes();
  }

  setAllTime() {
    this.filterDateFrom = ''; this.filterDateTo = ''; this.activeQuick = 'all'; this.page = 1; this.loadWastes();
  }

  onSearchChange(value: string) {
    this.selectedIndex = -1;
    if (!value || value.length < 2) { this.filteredProducts = []; this.searching = false; return; }
    if (this.scanInProgress) return;
    this.searching = true;
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
        this.scanInProgress = true;
        this.productSearch = '';
        this.filteredProducts = [];
        this.searching = false;
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
        this.scanInProgress = false;
        const results = res.data ?? res;
        if (!results?.length) { this.showToast(`Not found: ${sku}`, 'error'); return; }
        const product = results.find((p: any) => p.sku === sku) ?? results[0];
        this.selectProduct(product);
      },
      error: () => {
        this.scanInProgress = false;
        this.showToast(`Not found: ${sku}`, 'error');
      }
    });
  }

  selectProduct(product: any) {
    const existing = this.wasteItems.find(i => i.product_id === product.id);
    if (existing) {
      existing.quantity++;
      this.showToast(`${product.name} Ã—${existing.quantity}`, 'success');
      // focus that row's qty input
      const idx = this.wasteItems.indexOf(existing);
      setTimeout(() => {
        const inputs = this.qtyInputs.toArray();
        inputs[idx]?.nativeElement.focus();
      }, 50);
    } else {
      this.wasteItems.unshift({
        product_id: product.id,
        product_name: product.name,
        current_stock: product.current_stock,
        sku: product.sku || '',
        quantity: 1,
        reason: ''
      });
      this.showToast(`Added: ${product.name}`, 'success');
      setTimeout(() => this.qtyInputs.first?.nativeElement.focus(), 50);
    }
    this.filteredProducts = [];
    this.productSearch = '';
    this.selectedIndex = -1;
  }

  removeRow(index: number) {
    this.wasteItems.splice(index, 1);
  }

  private showToast(message: string, type: 'success' | 'error') {
    clearTimeout(this.toastTimer);
    this.scanToast = { message, type };
    this.toastTimer = setTimeout(() => { this.scanToast = null; }, 2500);
  }

  save() {
    if (this.wasteItems.length === 0) {
      this.toast.warning('Add at least one product to waste.');
      return;
    }
    for (const item of this.wasteItems) {
      if (!item.quantity || item.quantity < 1) {
        this.toast.warning(`Invalid quantity for ${item.product_name}.`);
        return;
      }
      if (item.quantity > item.current_stock) {
        this.toast.error(`Not enough stock for ${item.product_name}. Available: ${item.current_stock}`);
        return;
      }
      if (!item.reason.trim()) {
        this.toast.warning(`Please enter a reason for ${item.product_name}.`);
        return;
      }
    }

    this.saving = true;
    this.toast.startSaving();

    const requests = this.wasteItems.map(item => ({
      product_id: item.product_id,
      quantity: +item.quantity,
      reason: item.reason.trim()
    }));

    this.postSequentially(requests, 0);
  }

  private postSequentially(requests: any[], index: number) {
    if (index >= requests.length) {
      this.saving = false;
      this.toast.stopSaving();
      this.toast.success(`${requests.length} waste record(s) saved.`);
      this.wasteItems = [];
      this.loadWastes();
      this.searchInputRef.nativeElement.focus();
      return;
    }
    this.api.post('/product-wastes/', requests[index]).subscribe({
      next: () => this.postSequentially(requests, index + 1),
      error: (err) => {
        this.saving = false;
        this.toast.stopSaving();
        this.toast.error(err?.error?.detail || `Failed to save waste record ${index + 1}`);
      }
    });
  }
}

