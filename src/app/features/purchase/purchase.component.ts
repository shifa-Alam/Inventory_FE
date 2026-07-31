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

  // ── Payment at receiving time ──
  paid_amount: number | null = null;
  payment_method = 'CASH';
  paymentMethods = [
    { value: 'CASH', label: 'Cash' },
    { value: 'BKASH', label: 'bKash' },
    { value: 'NAGAD', label: 'Nagad' },
    { value: 'CARD', label: 'Card' },
    { value: 'BANK', label: 'Bank' },
    { value: 'OTHER', label: 'Other' },
  ];

  productSearch = '';
  filteredProducts: any[] = [];
  selectedIndex = -1;
  searching = false;
  items: any[] = [];

  searchSubject = new Subject<string>();
  unitsMap: Record<number, string> = {};

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
      error: () => { if (!this.scanInProgress) this.searching = false; }
    });
    this.loadSupplier();
    this.loadUnits();
  }

  loadUnits() {
    this.api.get('/units/?is_active=true').subscribe({
      next: (r: any) => {
        const list = r.data ?? r ?? [];
        this.unitsMap = {};
        for (const u of list) this.unitsMap[u.id] = u.symbol || u.name;
      },
      error: () => {}
    });
  }

  /** Units this product can be purchased in: base (factor 1) + configured. */
  private buildUnitOptions(product: any): any[] {
    if (!product?.base_unit_id) return [];
    const opts: any[] = [{ id: product.base_unit_id, name: this.unitsMap[product.base_unit_id] || 'base', factor: 1 }];
    for (const u of (product.units || [])) {
      opts.push({ id: u.unit_id, name: this.unitsMap[u.unit_id] || '', factor: u.factor });
    }
    return opts;
  }

  /** Attach unit dropdown state to a freshly-added line. */
  private applyLineUnits(item: any, product: any) {
    item.unitOptions = this.buildUnitOptions(product);
    item.unit_id = product.purchase_unit_id || product.base_unit_id || null;
    item.unit_label = item.unit_id ? (this.unitsMap[item.unit_id] || '') : '';
  }

  onLineUnitChange(item: any) {
    item.unit_label = item.unit_id ? (this.unitsMap[item.unit_id] || '') : '';
  }

  ngAfterViewInit() {
    this.searchInputRef.nativeElement.focus();
  }

  ngOnDestroy() {
    clearTimeout(this.toastTimer);
  }

  /** Focus the product search box and select what is in it, so the next
   *  keystroke replaces a half-typed term rather than appending to it. */
  private focusSearch() {
    const el = this.searchInputRef?.nativeElement;
    el?.focus();
    el?.select();
  }

  //   F2 → jump to product search
  @HostListener('document:keydown', ['$event'])
  onGlobalKey(event: KeyboardEvent) {
    // Modified keys belong to the browser or the OS, never to us. Without this
    // the single-char router below also swallowed Ctrl+P, Alt+D and friends and
    // typed them into the search box.
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    // Deliberately ahead of the focus check: F2 has to work while another field
    // has focus, which is the one thing the router below cannot do.
    if (event.key === 'F2') { event.preventDefault(); this.focusSearch(); return; }
    const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
    const isInputFocused = tag === 'input' || tag === 'select' || tag === 'textarea';
    if (!isInputFocused && event.key.length === 1) {
      this.searchInputRef.nativeElement.focus();
    }
  }

  loadSupplier() {
    this.api.get('/suppliers/?page=1&page_size=200').subscribe({
      next: (r: any) => { this.suppliers = r.data ?? r; },
      error: () => {}
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
        const product = res.find((p: any) => p.barcode === sku) ?? res[0];
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
      this.onQtyChange(existing);   // keep line + grand total in sync with the new qty
      this.showToast(`${product.name} × ${existing.quantity}`, 'success');
    } else {
      const rate = product.last_purchase_price || product.average_cost || 0;
      const line: any = {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        rate: rate,
        total: rate
      };
      this.applyLineUnits(line, product);
      this.items.unshift(line);
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
    const rate = product.last_purchase_price || product.average_cost || 0;
    const line: any = {
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      rate: rate,
      total: rate
    };
    this.applyLineUnits(line, product);
    this.items.unshift(line);
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

  getDue() {
    return Math.max(this.getTotal() - (+this.paid_amount! || 0), 0);
  }

  setFullPaid() {
    this.paid_amount = this.getTotal();
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
    const paid = +this.paid_amount! || 0;
    if (paid < 0) {
      this.toast.warning('Paid amount cannot be negative.');
      return;
    }
    if (paid > this.getTotal()) {
      this.toast.warning('Paid amount cannot exceed the purchase total.');
      return;
    }
    const payload = {
      supplier_id: +this.supplier_id,
      paid_amount: paid,
      payment_method: this.payment_method,
      items: this.items.map(i => ({
        product_id: +i.product_id,
        quantity: +i.quantity,
        rate: +i.rate,
        unit_id: i.unit_id || null
      })),
      total_amount: this.getTotal()
    };
    this.toast.startSaving();
    this.api.post('/purchases/', payload).subscribe({
      next: () => {
        this.toast.stopSaving(); this.toast.success('Purchase Saved');
        this.items = [];
        this.supplier_id = 0;
        this.paid_amount = null;
        this.payment_method = 'CASH';
        this.searchInputRef.nativeElement.focus();
      },
      error: () => { this.toast.stopSaving(); this.toast.error('Failed to save purchase'); }
    });
  }
}
