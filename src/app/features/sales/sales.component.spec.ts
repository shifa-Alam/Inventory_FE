import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../testing/test-providers';

import { SalesComponent } from './sales.component';

/** Keyboard event helper — `key` plus whatever modifiers a case needs. */
function key(k: string, mods: Partial<KeyboardEventInit> = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...mods });
}

describe('SalesComponent', () => {
  let component: SalesComponent;
  let fixture: ComponentFixture<SalesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesComponent],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Customer picker: the till cannot be driven by keyboard without this ──
  describe('customer dropdown keyboard navigation', () => {
    beforeEach(() => {
      component.ddResults = [
        { id: 1, name: 'Alpha Store', phone: '01700000001' },
        { id: 2, name: 'Beta Traders', phone: '01700000002' },
        { id: 3, name: 'Gamma Ltd', phone: '01700000003' },
      ];
      component.ddIndex = -1;
      component.ddOpen = true;
    });

    it('ArrowDown walks the list and wraps at the end', () => {
      component.onDdKeyDown(key('ArrowDown'));
      expect(component.ddIndex).toBe(0);
      component.onDdKeyDown(key('ArrowDown'));
      component.onDdKeyDown(key('ArrowDown'));
      expect(component.ddIndex).toBe(2);
      component.onDdKeyDown(key('ArrowDown'));
      expect(component.ddIndex).toBe(0);
    });

    it('ArrowUp from nothing selected wraps to the last row', () => {
      component.onDdKeyDown(key('ArrowUp'));
      expect(component.ddIndex).toBe(2);
    });

    it('Enter picks the highlighted customer', () => {
      component.ddIndex = 1;
      component.onDdKeyDown(key('Enter'));
      expect(component.customer_id).toBe(2);
      expect(component.selectedCustomer.name).toBe('Beta Traders');
      expect(component.ddOpen).toBeFalse();
    });

    it('Enter with nothing highlighted picks nobody', () => {
      component.ddIndex = -1;
      component.onDdKeyDown(key('Enter'));
      expect(component.customer_id).toBe(0);
      expect(component.selectedCustomer).toBeNull();
    });

    it('Escape closes the picker without choosing', () => {
      component.ddIndex = 1;
      component.onDdKeyDown(key('Escape'));
      expect(component.ddOpen).toBeFalse();
      expect(component.customer_id).toBe(0);
    });

    // The barcode-scanner safety rule: a scanner is a fast keyboard ending in
    // Enter, so focus must always come to rest on the search box. If it does
    // not, the next scan types a barcode into whatever field was left focused.
    it('parks focus back on the search box after picking, and after Escape', () => {
      const back = spyOn(component as any, 'focusSearch');
      component.pickCustomer(component.ddResults[0]);
      expect(back).toHaveBeenCalledTimes(1);
      component.closeDropdown();
      expect(back).toHaveBeenCalledTimes(2);
    });

    it('parks focus back on the search box after F8 exact-paid', () => {
      const back = spyOn(component as any, 'focusSearch');
      component.setFullPaid();
      expect(back).toHaveBeenCalled();
    });
  });

  // ── Modifier guard: browser/OS combos must not reach the till ──
  describe('global shortcut modifier guard', () => {
    it('plain F9 submits but Ctrl+F9 does not', () => {
      const submit = spyOn(component, 'submit');
      component.onGlobalKey(key('F9'));
      expect(submit).toHaveBeenCalledTimes(1);
      component.onGlobalKey(key('F9', { ctrlKey: true }));
      expect(submit).toHaveBeenCalledTimes(1);
    });

    it('Alt+F4 does not open the customer picker on its way to closing the window', () => {
      const open = spyOn(component, 'openDropdown');
      component.onGlobalKey(key('F4', { altKey: true }));
      expect(open).not.toHaveBeenCalled();
      component.onGlobalKey(key('F4'));
      expect(open).toHaveBeenCalledTimes(1);
    });

    it('a bare letter routes to the search box but Ctrl+letter is left alone', () => {
      const search = component.searchInputRef.nativeElement;
      // ngAfterViewInit already parked focus in the search input, and the router
      // deliberately stands down while any field has focus — blur first so this
      // exercises the "focus is nowhere" path the rule is actually for.
      (document.activeElement as HTMLElement | null)?.blur();
      const focus = spyOn(search, 'focus');

      component.onGlobalKey(key('a'));
      expect(focus).toHaveBeenCalledTimes(1);

      component.onGlobalKey(key('p', { ctrlKey: true }));
      expect(focus).toHaveBeenCalledTimes(1);
    });
  });

  // ── Cashier loop: scan → qty → scan, no mouse ──
  describe('quantity field keys', () => {
    beforeEach(() => {
      component.items = [
        { product_id: 1, product_name: 'A', quantity: 1, rate: 10, stock: 5, unitOptions: [] },
        { product_id: 2, product_name: 'B', quantity: 1, rate: 20, stock: 5, unitOptions: [] },
      ];
      fixture.detectChanges();
    });

    /** The qty boxes actually on screen, in the layout Karma happens to render.
     *  The line list exists twice (desktop table + mobile cards), so the raw
     *  ViewChildren query holds two inputs per line and half are display:none. */
    const onScreenQty = () =>
      component.qtyInputs.toArray().map(r => r.nativeElement).filter(el => el.offsetParent !== null);

    it('exposes exactly one on-screen qty input per line', () => {
      // Guards the duplicate-template trap: if this ever exceeds items.length,
      // both layouts are visible at once and focus movement is ambiguous.
      expect(onScreenQty().length).toBe(2);
      expect(component.qtyInputs.length).toBeGreaterThanOrEqual(2);
    });

    it('Enter returns to the product search box', () => {
      // Spy on focusSearch itself rather than the deferred DOM focus: the real
      // call is inside a setTimeout, so asserting on the element would need
      // fakeAsync and would be testing the timer, not the behaviour.
      const back = spyOn(component as any, 'focusSearch');
      component.onQtyKeyDown(key('Enter'));
      expect(back).toHaveBeenCalled();
    });

    it('Alt+ArrowDown moves focus to the next line', () => {
      const rows = onScreenQty();
      rows[0].focus();
      // Dispatched for real so the handler reads event.target, the way it does
      // in the browser — the whole point of dropping the *ngFor index.
      rows[0].dispatchEvent(key('ArrowDown', { altKey: true }));
      expect(document.activeElement).toBe(rows[1]);
    });

    it('Alt+ArrowUp moves focus to the previous line', () => {
      const rows = onScreenQty();
      rows[1].focus();
      rows[1].dispatchEvent(key('ArrowUp', { altKey: true }));
      expect(document.activeElement).toBe(rows[0]);
    });

    it('Alt+ArrowUp on the first line stays put', () => {
      const rows = onScreenQty();
      rows[0].focus();
      rows[0].dispatchEvent(key('ArrowUp', { altKey: true }));
      expect(document.activeElement).toBe(rows[0]);
    });

    it('Alt+ArrowDown on the last line stays put, never landing in the hidden copy', () => {
      const rows = onScreenQty();
      const last = rows[rows.length - 1];
      last.focus();
      last.dispatchEvent(key('ArrowDown', { altKey: true }));
      expect(document.activeElement).toBe(last);
    });

    it('leaves bare ArrowDown alone so the number input can still step the qty', () => {
      const rows = onScreenQty();
      rows[0].focus();
      rows[0].dispatchEvent(key('ArrowDown'));
      expect(document.activeElement).toBe(rows[0]);
    });
  });
});
