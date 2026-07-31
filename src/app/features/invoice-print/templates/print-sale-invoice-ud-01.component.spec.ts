import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../../testing/test-providers';
import { DEFAULT_INVOICE_SETTINGS, TenantInvoiceSettings } from '../../../core/services/tenant-settings.service';

import { PrintSaleInvoiceUd01Component } from './print-sale-invoice-ud-01.component';

/**
 * The print screen sits behind the auth guard, so the template is exercised
 * directly here: it is a brand-new document with a lot of optional blocks, and
 * "does it render at all, and does each toggle actually gate its block" is the
 * part that would otherwise only be found by a shopkeeper printing a real sale.
 */
describe('PrintSaleInvoiceUd01Component', () => {
  let component: PrintSaleInvoiceUd01Component;
  let fixture: ComponentFixture<PrintSaleInvoiceUd01Component>;

  const invoice = {
    invoice_no: 'INV-20260731-00042',
    created_at: '2026-07-31T10:00:00',
    customer_name: 'Lazz Pharma Ltd',
    customer_phone: '01714069104',
    customer_address: '1/C P, Kafrul, Dhaka',
    items: [
      { product_name: 'Oreo Biscuit', quantity: 11, rate: 120, mrp: 150, barcode: '8901' },
      { product_name: 'Kitkat 38.5g', quantity: 42, rate: 75, mrp: 90, barcode: '8902' },
    ],
    subtotal: 4470,
    discount_amount: 470,
    total_amount: 4000,
    paid_amount: 1500,
    due_amount: 2500,
  };

  /** Codes off by default so the spec does not drag in the QR/barcode libs. */
  function settingsWith(overrides: Partial<TenantInvoiceSettings['options']> = {},
                        tenant: Partial<TenantInvoiceSettings['settings']> = {}): TenantInvoiceSettings {
    return {
      ...DEFAULT_INVOICE_SETTINGS,
      shop_name: 'Uttara Distributors',
      address: '58, New Market, Dhaka-1205',
      phone: '02-9110000',
      options: { ...DEFAULT_INVOICE_SETTINGS.options, show_qr: false, show_barcode: false, ...overrides },
      settings: { ...DEFAULT_INVOICE_SETTINGS.settings, ...tenant },
    };
  }

  function mount(settings: TenantInvoiceSettings) {
    component.invoice = invoice;
    component.settings = settings;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrintSaleInvoiceUd01Component],
      providers: testProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(PrintSaleInvoiceUd01Component);
    component = fixture.componentInstance;
  });

  it('renders the letterhead, invoice number and every line', () => {
    const el = mount(settingsWith());
    expect(el.querySelector('.ud-shop')?.textContent).toContain('Uttara Distributors');
    expect(el.textContent).toContain('INV-20260731-00042');
    expect(el.querySelectorAll('.ud-items tbody tr').length).toBe(2);
    expect(el.textContent).toContain('Oreo Biscuit');
  });

  it('states the payable total in words, not the subtotal', () => {
    const el = mount(settingsWith());
    const words = el.querySelector('.ud-words-val')?.textContent ?? '';
    // total_amount is 4000 after the 470 discount; the subtotal is 4470.
    expect(words).toBe('Taka Four Thousand Only');
    expect(words).not.toContain('Four Thousand Four Hundred');
  });

  it('computes its own subtotal and quantity footer from the lines', () => {
    mount(settingsWith());
    expect(component.subtotal).toBe(11 * 120 + 42 * 75);
    expect(component.lineCount).toBe(2);
    expect(component.totalQty).toBe(53);
  });

  it('gates the MRP column on show_mrp', () => {
    let el = mount(settingsWith({ show_mrp: true }));
    let heads = el.querySelectorAll('.ud-items thead th').length;
    expect(heads).toBe(6);

    fixture = TestBed.createComponent(PrintSaleInvoiceUd01Component);
    component = fixture.componentInstance;
    el = mount(settingsWith({ show_mrp: false }));
    expect(el.querySelectorAll('.ud-items thead th').length).toBe(heads - 1);
    // The body must lose the same cell, or the footer colspan drifts.
    expect(el.querySelectorAll('.ud-items tbody tr:first-child td').length).toBe(5);
  });

  it('hides the statutory strip until the tenant fills in BIN or trade licence', () => {
    let el = mount(settingsWith());
    expect(el.querySelector('.ud-legal')).toBeNull();

    fixture = TestBed.createComponent(PrintSaleInvoiceUd01Component);
    component = fixture.componentInstance;
    el = mount(settingsWith({}, { bin_vat: '004123456-0202' }));
    expect(el.querySelector('.ud-legal')?.textContent).toContain('004123456-0202');
  });

  it('marks a fully settled invoice as paid', () => {
    component.invoice = { ...invoice, due_amount: 0 };
    component.settings = settingsWith({ show_status: true });
    fixture.detectChanges();
    expect(component.isPaid).toBeTrue();
    expect((fixture.nativeElement as HTMLElement).querySelector('.ud-status.is-paid')).not.toBeNull();
  });

  it('survives an invoice with no lines at all', () => {
    component.invoice = { invoice_no: 'X', items: [] };
    component.settings = settingsWith();
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(component.subtotal).toBe(0);
    expect(component.payableInWords).toBe('Taka Zero Only');
  });
});
