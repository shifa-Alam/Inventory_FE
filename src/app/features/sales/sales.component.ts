import { Component, OnInit, OnDestroy, AfterViewInit, DestroyRef, inject, HostListener, ViewChild, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../shared/services/toast.service';
import { Subject, EMPTY } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { localDateStr } from '../../shared/utils/date.utils';
import { TenantSettingsService } from '../../core/services/tenant-settings.service';

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
  @ViewChild('ddSearch') ddSearchRef?: ElementRef<HTMLInputElement>;
  @ViewChildren('dpItem') dpItems!: QueryList<ElementRef<HTMLElement>>;

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
  /** Keyboard-highlighted row in the customer dropdown; -1 = nothing chosen.
   *  Same convention as selectedIndex for the product list. */
  ddIndex = -1;

  // Phone search
  customerPhone = '';
  phoneResults: any[] = [];
  phoneNotFound = false;
  newCustomerName = '';
  /** Keyboard-highlighted row in the phone-lookup results. */
  phoneIndex = -1;

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

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private router: Router,
    private translate: TranslateService,
    private tenantSettings: TenantSettingsService
  ) { }

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
  //   F2 → jump to product search · F4 → open customer picker
  //   F8 → mark fully paid · F9 → complete sale
  @HostListener('document:keydown', ['$event'])
  onGlobalKey(event: KeyboardEvent) {
    // A modified key is never ours. It belongs to the browser (Ctrl+P), the OS
    // (Alt+F4 — which would otherwise ALSO fire our F4 handler on its way out),
    // or to a local handler such as Alt+↑/↓ row movement in the qty column.
    // Without this the single-char router at the bottom swallowed Ctrl+P, Alt+D
    // and friends too, and typed them into the search box.
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    // F2 works even while another field has focus — that is the whole point of
    // it. The single-char router below only fires when focus is nowhere, so
    // without this there was no way back to the search box from, say, the
    // discount field except reaching for the mouse.
    if (event.key === 'F2') { event.preventDefault(); this.focusSearch(); return; }
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

  /**
   * Park focus back on the product search box.
   *
   * This is the single rule that keeps a barcode scanner safe. A scanner is just
   * a very fast keyboard that ends with Enter, so whenever an interaction
   * finishes — customer picked, F8 pressed, dropdown dismissed — focus has to
   * come back here. Otherwise the next scan types a barcode into the discount or
   * cash-received field, which is the classic POS data-corruption bug.
   */
  private focusSearch() {
    setTimeout(() => {
      const el = this.searchInputRef?.nativeElement;
      el?.focus();
      // Select whatever is sitting there so the next keystroke replaces it. On
      // F2 the box often still holds a half-typed term the cashier abandoned.
      el?.select();
    }, 0);
  }

  /**
   * The qty inputs that are actually on screen.
   *
   * The line list is rendered TWICE — the desktop table and the mobile item
   * cards — and both mark their input `#qtyInput`, so the ViewChildren query
   * returns two refs per line. Anything that moves focus has to filter to the
   * live layout first, or focus lands in the `display:none` copy and vanishes.
   */
  private visibleQtyInputs(): HTMLInputElement[] {
    return this.qtyInputs
      .toArray()
      .map(r => r.nativeElement)
      .filter(el => el.offsetParent !== null);
  }

  /** Focus the first on-screen qty box — used right after a line is added. */
  private focusFirstQty(delay = 0) {
    setTimeout(() => {
      const el = this.visibleQtyInputs()[0];
      el?.focus();
      el?.select();
    }, delay);
  }

  /** One tap / F8: customer pays the exact bill. */
  setFullPaid() {
    this.paid_amount = this.payable;
    this.cashReceived = this.payable;
    this.focusSearch();
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
      next: (res: any) => {
        this.ddResults = res.data ?? res;
        // Only auto-highlight an unambiguous single hit, so Enter can never pick
        // the wrong customer off a list. Same rule as the product search.
        this.ddIndex = this.ddResults.length === 1 ? 0 : -1;
      },
      error: () => {}
    });
  }

  openDropdown() {
    this.ddOpen = true;
    this.ddQuery = '';
    this.ddIndex = -1;
    this.loadDdCustomers('');
    // Focus the panel's own search box: without this the list opens but is
    // unreachable without a mouse, and a customer is mandatory to submit.
    setTimeout(() => this.ddSearchRef?.nativeElement.focus(), 0);
  }

  closeDropdown() {
    this.ddOpen = false;
    this.ddIndex = -1;
    this.focusSearch();
  }

  /** Arrow/Enter/Escape inside the customer dropdown — deliberately the same
   *  shape as onKeyDown()'s product-list handling so both lists feel identical. */
  onDdKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (this.ddResults.length) {
        this.ddIndex = this.ddIndex < this.ddResults.length - 1 ? this.ddIndex + 1 : 0;
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.ddResults.length) {
        this.ddIndex = this.ddIndex > 0 ? this.ddIndex - 1 : this.ddResults.length - 1;
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.ddIndex >= 0 && this.ddResults[this.ddIndex]) {
        this.pickCustomer(this.ddResults[this.ddIndex]);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.closeDropdown();
    }
  }

  /** Same navigation for the phone-lookup result list. */
  onPhoneKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (this.phoneResults.length) {
        this.phoneIndex = this.phoneIndex < this.phoneResults.length - 1 ? this.phoneIndex + 1 : 0;
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.phoneResults.length) {
        this.phoneIndex = this.phoneIndex > 0 ? this.phoneIndex - 1 : this.phoneResults.length - 1;
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.phoneIndex >= 0 && this.phoneResults[this.phoneIndex]) {
        const picked = this.phoneResults[this.phoneIndex];
        this.clearPhone();
        this.pickCustomer(picked);
      }
    }
  }

  /**
   * Qty column keys.
   *
   * Plain ↑/↓ are left alone on purpose: on a number input they step the
   * quantity, which a cashier uses constantly. Row-to-row movement is therefore
   * Alt+↑/↓. Enter goes back to the search box, which is the real cashier loop —
   * scan → qty → scan → qty — so the till never needs a mouse between items.
   */
  onQtyKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.focusSearch();
      return;
    }
    if (event.altKey && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      // Position is derived from the event target, not from the template's
      // *ngFor index: that index counts rows in one layout while the query
      // holds inputs from both, so the two disagree on the last row.
      const rows = this.visibleQtyInputs();
      const from = rows.indexOf(event.target as HTMLInputElement);
      if (from === -1) return;
      const next = event.key === 'ArrowDown' ? from + 1 : from - 1;
      if (next >= 0 && next < rows.length) {
        // focus() first, select() only as a bonus: on <input type="number"> the
        // selection APIs do not apply, so select() alone is a no-op in some
        // browsers and focus would never have moved — the whole point here.
        rows[next].focus();
        rows[next].select();
      }
    }
  }

  onDdFocusOut(event: FocusEvent) {
    const wrap = (event.currentTarget as HTMLElement);
    if (!wrap.contains(event.relatedTarget as Node)) {
      this.ddOpen = false;
    }
  }

  onDdSearch(q: string) { this.loadDdCustomers(q); }

  /**
   * One-tap "Walk-in Customer" pick for quick cash sales.
   *
   * Every sale is still booked against a real customer_id (submit() enforces
   * that, and the backend needs the FK) — this just removes the search/create
   * friction for the common case by finding-or-creating one canonical
   * "Walk-in Customer" record and reusing it. The name is a fixed English
   * string regardless of UI language so switching বাংলা/English never spawns
   * a second duplicate customer; only the button label is translated.
   */
  private static readonly WALK_IN_NAME = 'Walk-in Customer';
  private walkInCustomer: any = null;

  pickWalkIn() {
    if (this.walkInCustomer) { this.pickCustomer(this.walkInCustomer); return; }
    this.api.get(`/customers/?name=${encodeURIComponent(SalesComponent.WALK_IN_NAME)}&page=1&page_size=1`).subscribe({
      next: (res: any) => {
        const list = res.data ?? res;
        if (list?.length) {
          this.walkInCustomer = list[0];
          this.pickCustomer(this.walkInCustomer);
        } else {
          this.api.post('/customers/', { name: SalesComponent.WALK_IN_NAME, phone: '', address: '', credit_limit: 0, opening_due: 0 }).subscribe({
            next: (created: any) => {
              this.walkInCustomer = created;
              this.pickCustomer(created);
            },
            error: () => this.toast.error(this.translate.instant('sales.customer_add_failed'))
          });
        }
      },
      error: () => this.toast.error(this.translate.instant('sales.customer_add_failed'))
    });
  }

  pickCustomer(c: any | null) {
    this.selectedCustomer = c;
    this.customer_id = c ? c.id : 0;
    this.ddOpen = false;
    this.ddQuery = '';
    this.ddIndex = -1;
    this.phoneIndex = -1;
    this.focusSearch();
  }

  // ── Phone search ──────────────────────────────────────────
  onPhoneChange(phone: string) {
    this.phoneResults = [];
    this.phoneNotFound = false;
    this.newCustomerName = '';
    this.phoneIndex = -1;
    if (phone.trim().length < 3) return;
    this.api.get(`/customers/?phone=${encodeURIComponent(phone.trim())}&page=1&page_size=10`).subscribe({
      next: (res: any) => {
        const list = res.data ?? res;
        this.phoneResults = list;
        this.phoneIndex = list.length === 1 ? 0 : -1;
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
    this.phoneIndex = -1;
  }

  savePhoneCustomer() {
    const payload = { name: this.newCustomerName.trim(), phone: this.customerPhone.trim(), address: '', credit_limit: 0, opening_due: 0 };
    this.api.post('/customers/', payload).subscribe({
      next: (res: any) => {
        this.toast.success(this.translate.instant('sales.customer_added', { name: payload.name }));
        this.pickCustomer(res);
        this.clearPhone();
        this.loadDdCustomers('');
      },
      error: () => { this.toast.error(this.translate.instant('sales.customer_add_failed')); }
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
        this.revealSelected();
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.filteredProducts.length) {
        this.selectedIndex = this.selectedIndex > 0
          ? this.selectedIndex - 1 : this.filteredProducts.length - 1;
        this.revealSelected();
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

  /**
   * Keep the arrow-key highlight inside the scrollable dropdown.
   *
   * The panel is capped in height and the API returns up to 15 matches, so
   * without this the highlight walked off the bottom and the cashier was
   * arrowing blind — the list itself never moved. `block: 'nearest'` scrolls the
   * minimum needed, so the panel does not jump when the row is already visible.
   */
  private revealSelected() {
    const el = this.dpItems?.toArray()[this.selectedIndex]?.nativeElement;
    el?.scrollIntoView({ block: 'nearest' });
  }

  private lookupBarcode(sku: string) {
    this.api.get(`/products/search?q=${encodeURIComponent(sku)}`).subscribe({
      next: (res: any) => {
        this.scanInProgress = false;
        this.searching = false;
        this.filteredProducts = [];
        if (!res?.length) {
          this.showToast(this.translate.instant('sales.not_found_sku', { sku }), 'error');
          return;
        }
        const product = res.find((p: any) => p.barcode === sku) ?? res[0];
        this.addOrIncrement(product);
      },
      error: () => {
        this.scanInProgress = false;
        this.searching = false;
        this.filteredProducts = [];
        this.showToast(this.translate.instant('sales.not_found_sku', { sku }), 'error');
      }
    });
  }

  private addOrIncrement(product: any) {
    if (product.current_stock <= 0) {
      this.showToast(this.translate.instant('sales.out_of_stock_named', { name: product.name }), 'error');
      return;
    }
    const existing = this.items.find(i => i.product_id === product.id);
    if (existing) {
      // Stock is in base units; the line may be in a bigger unit (a Box of 12).
      const max = this.maxUnitQty(existing);
      if (existing.quantity >= max) {
        this.showToast(this.translate.instant('sales.max_stock_reached', { name: product.name, max, unit: existing.unit_label || '' }), 'error');
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
      this.showToast(this.translate.instant('sales.added_named', { name: product.name }), 'success');
      this.focusFirstQty();
    }
  }

  clampQuantity(item: any) {
    if (item.quantity < 1) item.quantity = 1;
    // Stock is kept in base units; cap the qty by how many of the line's unit
    // fit in the available base stock (e.g. 100 pcs = 8 boxes of 12).
    const max = this.maxUnitQty(item);
    if (item.quantity > max) {
      item.quantity = max;
      this.showToast(this.translate.instant('sales.max_stock_for', { name: item.product_name, max, unit: item.unit_label || '' }), 'error');
    }
  }

  private showToast(message: string, type: 'success' | 'error') {
    clearTimeout(this.toastTimer);
    this.scanToast = { message, type };
    this.toastTimer = setTimeout(() => { this.scanToast = null; }, 2500);
  }

  selectProduct(product: any) {
    if (product.current_stock <= 0) {
      this.toast.error(this.translate.instant('sales.out_of_stock_dot', { name: product.name }));
      return;
    }
    if (this.items.find(i => i.product_id === product.id)) {
      this.toast.warning(this.translate.instant('sales.product_already_added'));
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
    this.focusFirstQty(50);
  }

  removeRow(i: number) { this.items.splice(i, 1); }

  // ── Mobile: swipe-left-to-delete on item cards ────────────
  // A committed swipe (more horizontal than vertical movement, past a small
  // dead zone) drags the card to reveal a red delete action underneath;
  // everything short of that — a tap on the qty stepper, a vertical scroll —
  // passes through untouched because swipeDragging never flips true.
  private readonly SWIPE_REVEAL = 76;
  private swipeStartX = 0;
  private swipeStartY = 0;
  swipingIndex = -1;
  swipeDragging = false;
  openSwipeIndex = -1;

  onSwipeStart(event: TouchEvent, i: number) {
    if (event.touches.length !== 1) return;
    // Only one card is ever open at a time — starting a new gesture elsewhere
    // closes whichever card was left revealed.
    if (this.openSwipeIndex !== -1 && this.openSwipeIndex !== i) {
      const prev = this.items[this.openSwipeIndex];
      if (prev) prev._dx = 0;
      this.openSwipeIndex = -1;
    }
    this.swipingIndex = i;
    this.swipeStartX = event.touches[0].clientX;
    this.swipeStartY = event.touches[0].clientY;
    this.swipeDragging = false;
  }

  onSwipeMove(event: TouchEvent, item: any, i: number) {
    if (this.swipingIndex !== i) return;
    const dx = event.touches[0].clientX - this.swipeStartX;
    const dy = event.touches[0].clientY - this.swipeStartY;
    if (!this.swipeDragging) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) >= Math.abs(dx)) { this.swipingIndex = -1; return; } // vertical scroll wins
      this.swipeDragging = true;
    }
    event.preventDefault();
    const base = this.openSwipeIndex === i ? -this.SWIPE_REVEAL : 0;
    item._dx = Math.max(-this.SWIPE_REVEAL, Math.min(0, base + dx));
  }

  onSwipeEnd(item: any, i: number) {
    if (this.swipingIndex !== i) return;
    this.swipingIndex = -1;
    if (!this.swipeDragging) return;
    this.swipeDragging = false;
    const open = (item._dx ?? 0) < -this.SWIPE_REVEAL * 0.4;
    item._dx = open ? -this.SWIPE_REVEAL : 0;
    this.openSwipeIndex = open ? i : -1;
  }

  /** Delete tapped from the revealed swipe action. */
  removeRowSwiped(i: number) {
    this.openSwipeIndex = -1;
    this.removeRow(i);
  }

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
      this.toast.warning(this.translate.instant('sales.select_customer_first'));
      return;
    }
    if (this.items.length === 0) {
      this.toast.warning(this.translate.instant('sales.add_at_least_one'));
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
        // "Auto-print after sale" — the toggle was previously ignored and every
        // sale navigated with ?print=1 unconditionally, so it fired regardless
        // of the setting.
        this.tenantSettings.getSettings().subscribe({
          next: (s) => this.goToInvoice(res.id, s.options.auto_print),
          error: () => this.goToInvoice(res.id, false),
        });
      },
      error: (err) => {
        this.saving = false;
        this.toast.stopSaving();
        this.toast.error(err?.error?.detail || this.translate.instant('sales.submit_failed'));
      }
    });
  }

  private goToInvoice(id: number, autoPrint: boolean): void {
    this.router.navigate(['/invoice', id], autoPrint ? { queryParams: { print: '1' } } : {});
  }
}
