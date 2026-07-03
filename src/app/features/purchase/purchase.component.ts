import { Component, OnInit, OnDestroy, AfterViewInit, DestroyRef, inject, HostListener, ViewChild, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../shared/services/toast.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, EMPTY } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-purchase',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './purchase.component.html',
  styleUrls: ['./purchase.component.css']
})
export class PurchaseComponent implements OnInit, AfterViewInit, OnDestroy {
  private destroyRef = inject(DestroyRef);

  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;
  @ViewChildren('qtyInput') qtyInputs!: QueryList<ElementRef<HTMLInputElement>>;

  supplier_id = 0;
  suppliers: any[] = [];

  productSearch = '';
  filteredProducts: any[] = [];
  selectedIndex = -1;
  searching = false;
  items: any[] = [];

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
        this.filteredProducts = res;
        this.selectedIndex = this.filteredProducts.length === 1 ? 0 : -1;
        this.searching = false;
      },
      error: (err) => { if (!this.scanInProgress) this.searching = false; console.error('Product search failed', err); }
    });
    this.loadSupplier();
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

  loadSupplier() {
    this.api.get('/suppliers/?page=1&page_size=1000').subscribe({
      next: (r: any) => { this.suppliers = r.data ?? r; },
      error: (err) => console.error('Failed to load suppliers', err)
    });
  }

  onSearchChange(value: string) {
    this.selectedIndex = -1;
    if (!value || value.length < 2) {
      this.filteredProducts = [];
      this.searching = false;
      return;
    }
    if (this.scanInProgress) return;
    this.searching = true;
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
        this.selectProduct(this.filteredProducts[this.selectedIndex]);
      } else if (this.productSearch.trim().length >= 2) {
        const code = this.productSearch.trim();
        this.scanInProgress = true;
        this.productSearch = '';
        this.filteredProducts = [];
        this.searching = false;
        this.searchSubject.next(''); // cancel pending debounce
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
        this.searching = false;
        this.filteredProducts = [];
        if (!res?.length) {
          this.showToast(`Not found: ${sku}`, 'error');
          return;
        }
        const product = res.find((p: any) => p.sku === sku) ?? res[0];
        this.addOrIncrement(product);
      },
      error: () => {
        this.scanInProgress = false;
        this.searching = false;
        this.filteredProducts = [];
        this.showToast(`Not found: ${sku}`, 'error');
      }
    });
  }

  private addOrIncrement(product: any) {
    const existing = this.items.find(i => i.product_id === product.id);
    if (existing) {
      existing.quantity++;
      this.showToast(`${product.name} × ${existing.quantity}`, 'success');
    } else {
      const rate = product.purchase_price || 0;
      this.items.unshift({
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        rate: rate,
        total: rate
      });
      this.showToast(`Added: ${product.name}`, 'success');
    }
  }

  private showToast(message: string, type: 'success' | 'error') {
    clearTimeout(this.toastTimer);
    this.scanToast = { message, type };
    this.toastTimer = setTimeout(() => { this.scanToast = null; }, 2500);
  }

  selectProduct(product: any) {
    if (this.items.find(i => i.product_id === product.id)) {
      this.toast.warning('Product already added!');
      return;
    }
    const rate = product.purchase_price || 0;
    this.items.unshift({
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      rate: rate,
      total: rate
    });
    this.filteredProducts = [];
    this.productSearch = '';
    this.selectedIndex = -1;
    setTimeout(() => this.qtyInputs.first?.nativeElement.focus(), 50);
  }

  onQtyChange(item: any) {
    const qty = +item.quantity || 0;
    item.total = qty * (+item.rate || 0);
  }

  onTotalChange(item: any) {
    const qty = +item.quantity || 0;
    item.rate = qty > 0 ? (+item.total || 0) / qty : 0;
  }

  removeRow(i: number) { this.items.splice(i, 1); }

  getTotal() {
    return this.items.reduce((a, b) => a + (+b.total || 0), 0);
  }

  save() {
    if (!this.supplier_id || +this.supplier_id === 0) {
      this.toast.warning('Please select a supplier before saving.');
      return;
    }
    if (this.items.length === 0) {
      this.toast.warning('Please add at least one product.');
      return;
    }
    const payload = {
      supplier_id: +this.supplier_id,
      items: this.items.map(i => ({
        product_id: +i.product_id,
        quantity: +i.quantity,
        rate: +i.rate
      })),
      total_amount: this.getTotal()
    };
    this.toast.startSaving();
    this.api.post('/purchases/', payload).subscribe({
      next: () => {
        this.toast.stopSaving(); this.toast.success('Purchase Saved');
        this.items = [];
        this.supplier_id = 0;
        this.searchInputRef.nativeElement.focus();
      },
      error: (err) => { this.toast.stopSaving(); this.toast.error('Failed to save purchase'); console.error(err); }
    });
  }
}
