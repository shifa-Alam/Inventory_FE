import { Component, OnInit, OnDestroy, AfterViewInit, DestroyRef, inject, HostListener, ViewChild, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../shared/services/toast.service';
import { Subject, EMPTY } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { localDateStr } from '../../shared/utils/date.utils';

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
  @ViewChildren('qtyInput') qtyInputs!: QueryList<ElementRef<HTMLInputElement>>;

  customer_id: number = 0;
  paid_amount: number = 0;
  payment_method = 'CASH';
  discount: number = 0;
  delivery_date: string = localDateStr();

  /** Cash handed over by the customer — drives the change-due calculator. */
  cashReceived: number | null = null;
  /** True while a sale POST is in flight — blocks double submit. */
  saving = false;

  paymentMethods = [
    { value: 'CASH', label: 'Cash' },
    { value: 'BKASH', label: 'bKash' },
    { value: 'NAGAD', label: 'Nagad' },
    { value: 'CARD', label: 'Card' },
    { value: 'BANK', label: 'Bank' },
    { value: 'OTHER', label: 'Other' },
  ];

  // Dropdown
  selectedCustomer: any = null;
  ddOpen = false;
  ddQuery = '';
  ddResults: any[] = [];

  // Phone search
  customerPhone = '';
  phoneResults: any[] = [];
  phoneNotFound = false;
  newCustomerName = '';

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

  // Mobile checkout bottom sheet (UI state only)
  sheetOpen = false;

  constructor(private api: ApiService, private toast: ToastService, private router: Router) { }

  ngOnInit() {
    this.loadDdCustomers('');
    this.loadUnits();
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
  }

  ngAfterViewInit() {
    // Auto-focus so scanner input lands here immediately
    this.searchInputRef.nativeElement.focus();
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

  /** Units this product can be sold in: base (factor 1) + configured. */
  private buildUnitOptions(product: any): any[] {
    if (!product?.base_unit_id) return [];
    const opts: any[] = [{ id: product.base_unit_id, name: this.unitsMap[product.base_unit_id] || 'base', factor: 1 }];
    for (const u of (product.units || [])) {
      opts.push({ id: u.unit_id, name: this.unitsMap[u.unit_id] || '', factor: u.factor });
    }
    return opts;
  }

  /** Attach unit dropdown state (options, chosen unit, factor) to a line. */
  private applyLineUnits(item: any, product: any) {
    item.unitOptions = this.buildUnitOptions(product);
    item.unit_id = product.sale_unit_id || product.base_unit_id || null;
    item.factor = this.lineFactor(item);
    item.unit_label = item.unit_id ? (this.unitsMap[item.unit_id] || '') : '';
  }

  private lineFactor(item: any): number {
    const opt = (item.unitOptions || []).find((o: any) => o.id === +item.unit_id);
    return opt ? (+opt.factor || 1) : 1;
  }

  /** Max quantity sellable in the line's current unit (stock is in base). */
  maxUnitQty(item: any): number {
    const f = +item.factor || 1;
    return Math.floor((+item.stock || 0) / f);
  }

  onLineUnitChange(item: any) {
    item.factor = this.lineFactor(item);
    item.unit_label = item.unit_id ? (this.unitsMap[item.unit_id] || '') : '';
    this.clampQuantity(item);
  }

  ngOnDestroy() {
    clearTimeout(this.toastTimer);
  }

  // Cashier keyboard shortcuts + keypress-to-search routing.
  //   F4 → open customer picker · F8 → mark fully paid · F9 → complete sale
  @HostListener('document:keydown', ['$event'])
  onGlobalKey(event: KeyboardEvent) {
    if (event.key === 'F9') { event.preventDefault(); this.submit(); return; }
    if (event.key === 'F8') { event.preventDefault(); this.setFullPaid(); return; }
    if (event.key === 'F4') { event.preventDefault(); this.openDropdown(); return; }
    const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
    const isInputFocused = tag === 'input' || tag === 'select' || tag === 'textarea';
    if (!isInputFocused && event.key.length === 1) {
      this.searchInputRef.nativeElement.focus();
    }
  }

  // ── Cashier helpers: payable / full-pay / change calculator ──
  get payable(): number {
    return Math.max(0, this.getTotal() - (this.discount || 0));
  }

  /** One tap / F8: customer pays the exact bill. */
  setFullPaid() {
    this.paid_amount = this.payable;
    this.cashReceived = this.payable;
  }

  /** Cash tender chips: note handed over (e.g. ৳500/৳1000). */
  setCashReceived(amount: number) {
    this.cashReceived = amount;
    // Paid can never exceed the bill — extra is change to hand back.
    this.paid_amount = Math.min(amount, this.payable);
  }

  onCashReceivedChange() {
    const cash = this.cashReceived || 0;
    this.paid_amount = Math.min(cash, this.payable);
  }

  /** ফেরত — cash to hand back when tender exceeds the bill. */
  get changeDue(): number {
    return Math.max(0, (this.cashReceived || 0) - this.payable);
  }

  /** Sensible note denominations ≥ payable for quick-tender chips. */
  get tenderChips(): number[] {
    const p = this.payable;
    if (p <= 0) return [];
    const notes = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
    const ups = notes.filter(n => n > p).slice(0, 2);
    return ups;
  }

  // ── Dropdown ──────────────────────────────────────────────
  loadDdCustomers(q: string) {
    const url = q.trim()
      ? `/customers/?name=${encodeURIComponent(q.trim())}&page=1&page_size=10`
      : `/customers/?page=1&page_size=10`;
    this.api.get(url).subscribe({
      next: (res: any) => { this.ddResults = res.data ?? res; },
      error: () => {}
    });
  }

  openDropdown() {
    this.ddOpen = true;
    this.ddQuery = '';
    this.loadDdCustomers('');
  }

  onDdFocusOut(event: FocusEvent) {
    const wrap = (event.currentTarget as HTMLElement);
    if (!wrap.contains(event.relatedTarget as Node)) {
      this.ddOpen = false;
    }
  }

  onDdSearch(q: string) { this.loadDdCustomers(q); }

  pickCustomer(c: any | null) {
    this.selectedCustomer = c;
    this.customer_id = c ? c.id : 0;
    this.ddOpen = false;
    this.ddQuery = '';
  }

  // ── Phone search ──────────────────────────────────────────
  onPhoneChange(phone: string) {
    this.phoneResults = [];
    this.phoneNotFound = false;
    this.newCustomerName = '';
    if (phone.trim().length < 3) return;
    this.api.get(`/customers/?phone=${encodeURIComponent(phone.trim())}&page=1&page_size=10`).subscribe({
      next: (res: any) => {
        const list = res.data ?? res;
        this.phoneResults = list;
        if (!list.length) this.phoneNotFound = true;
      },
      error: () => {}
    });
  }

  clearPhone() {
    this.customerPhone = '';
    this.phoneResults = [];
    this.phoneNotFound = false;
    this.newCustomerName = '';
  }

  savePhoneCustomer() {
    const payload = { name: this.newCustomerName.trim(), phone: this.customerPhone.trim(), address: '', credit_limit: 0, opening_due: 0 };
    this.api.post('/customers/', payload).subscribe({
      next: (res: any) => {
        this.toast.success(`Customer "${payload.name}" added`);
        this.pickCustomer(res);
        this.clearPhone();
        this.loadDdCustomers('');
      },
      error: () => { this.toast.error('Failed to add customer'); }
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
        // Manual selection from dropdown
        this.selectProduct(this.filteredProducts[this.selectedIndex]);
      } else if (this.productSearch.trim().length >= 2) {
        // Barcode scanner: immediate lookup, bypass debounce
        const code = this.productSearch.trim();
        this.scanInProgress = true;
        this.productSearch = '';
        this.filteredProducts = [];
        this.searching = false;
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
    if (product.current_stock <= 0) {
      this.showToast(`Out of stock: ${product.name}`, 'error');
      return;
    }
    const existing = this.items.find(i => i.product_id === product.id);
    if (existing) {
      // Stock is in base units; the line may be in a bigger unit (a Box of 12).
      const max = this.maxUnitQty(existing);
      if (existing.quantity >= max) {
        this.showToast(`Max stock reached: ${product.name} (${max} ${existing.unit_label || ''})`, 'error');
        return;
      }
      existing.quantity++;
      this.showToast(`${product.name} × ${existing.quantity}`, 'success');
    } else {
      const line: any = {
        product_id: product.id,
        product_name: product.name,
        stock: product.current_stock,
        mrp: product.mrp ?? 0,
        quantity: 1,
        rate: product.sale_price
      };
      this.applyLineUnits(line, product);
      this.items.unshift(line);
      this.showToast(`Added: ${product.name}`, 'success');
      setTimeout(() => this.qtyInputs.first?.nativeElement.focus(), 0);
    }
  }

  clampQuantity(item: any) {
    if (item.quantity < 1) item.quantity = 1;
    // Stock is kept in base units; cap the qty by how many of the line's unit
    // fit in the available base stock (e.g. 100 pcs = 8 boxes of 12).
    const max = this.maxUnitQty(item);
    if (item.quantity > max) {
      item.quantity = max;
      this.showToast(`Max stock for "${item.product_name}" is ${max} ${item.unit_label || ''}`, 'error');
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
    const line: any = {
      product_id: product.id,
      product_name: product.name,
      stock: product.current_stock,
      mrp: product.mrp ?? 0,
      quantity: 1,
      rate: product.sale_price
    };
    this.applyLineUnits(line, product);
    this.items.unshift(line);
    this.filteredProducts = [];
    this.productSearch = '';
    this.selectedIndex = -1;
    setTimeout(() => this.qtyInputs.first?.nativeElement.focus(), 50);
  }

  removeRow(i: number) { this.items.splice(i, 1); }

  getTotal(): number {
    return this.items.reduce((sum, i) => sum + (i.quantity * i.rate), 0);
  }

  // ── Mobile checkout sheet (UI only) ───────────────────────
  openSheet()  { this.sheetOpen = true; }
  closeSheet() { this.sheetOpen = false; }

  itemCount(): number {
    return this.items.reduce((sum, i) => sum + (+i.quantity || 0), 0);
  }

  submit() {
    if (this.saving) return;   // block double-click / repeated F9
    // Every sale must be booked against a registered customer
    if (!this.customer_id || this.customer_id <= 0) {
      this.toast.warning('Please select a customer before completing the sale.');
      return;
    }
    if (this.items.length === 0) {
      this.toast.warning('Please add at least one product.');
      return;
    }

    const payload: any = {
      customer_id: +this.customer_id,
      paid_amount: +this.paid_amount,
      payment_method: this.payment_method,
      discount: +this.discount,
      items: this.items.map(i => ({
        product_id: +i.product_id,
        quantity: +i.quantity,
        rate: +i.rate,
        unit_id: i.unit_id || null
      }))
    };

    if (this.delivery_date) {
      payload.delivery_date = this.delivery_date;
    }

    this.saving = true;
    this.toast.startSaving();
    this.api.post('/sales/', payload).subscribe({
      next: (res: any) => {
        this.saving = false;
        this.toast.stopSaving();
        this.sheetOpen = false;
        this.paid_amount = 0;
        this.payment_method = 'CASH';
        this.cashReceived = null;
        this.discount = 0;
        this.delivery_date = localDateStr();
        this.items = [];
        this.selectedCustomer = null;
        this.customer_id = 0;
        this.clearPhone();
        this.router.navigate(['/invoice', res.id], { queryParams: { print: '1' } });
      },
      error: (err) => {
        this.saving = false;
        this.toast.stopSaving();
        this.toast.error(err?.error?.detail || 'Failed to submit sale');
      }
    });
  }
}
