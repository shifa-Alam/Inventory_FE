import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../testing/test-providers';

import { LayoutComponent } from './layout.component';

describe('LayoutComponent', () => {
  let component: LayoutComponent;
  let fixture: ComponentFixture<LayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutComponent],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(LayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Collapsible sidebar sections ──
  // The sidebar hides ~29 destinations behind seven folds, so the matching has
  // to be exact: open the wrong section and the page you are on is invisible.
  describe('nav sections', () => {
    const sectionOf = (url: string) => (component as any).sectionOf(url) as string | null;

    it('maps a route to the section that owns it', () => {
      expect(sectionOf('/profit-loss')).toBe('reports');
      expect(sectionOf('/settings')).toBe('setup');
      expect(sectionOf('/expenses')).toBe('money');
    });

    it('files each party with the job it belongs to', () => {
      // The point of the job-based grouping: you reach for a customer while
      // selling and a supplier while buying, so they live in those sections
      // rather than in one abstract "people" bucket. Paying and collecting are
      // a separate job, done in a batch, so they sit together under money.
      expect(sectionOf('/customers')).toBe('sell');
      expect(sectionOf('/suppliers')).toBe('buy');
      expect(sectionOf('/customer-payment')).toBe('money');
      expect(sectionOf('/supplier-payment')).toBe('money');
    });

    it('does not confuse routes that share a prefix', () => {
      // '/customers' and '/customer-payment' now sit in DIFFERENT sections, so
      // a sloppy startsWith would file the payment screen under selling.
      expect(sectionOf('/customers')).toBe('sell');
      expect(sectionOf('/customer-payment')).toBe('money');
      expect(sectionOf('/suppliers')).toBe('buy');
      expect(sectionOf('/supplier-payment')).toBe('money');
      expect(sectionOf('/stock')).toBe('inventory');
      expect(sectionOf('/stock-count')).toBe('inventory');
      expect(sectionOf('/stock-ledger')).toBe('inventory');
      expect(sectionOf('/purchase')).toBe('buy');
      expect(sectionOf('/purchases')).toBe('buy');
      expect(sectionOf('/sales')).toBe('sell');
      expect(sectionOf('/sale-return')).toBe('sell');
    });

    it('prefers the most specific route, not the first declared', () => {
      // '/products/import' is a child of '/products'; longest-match is what
      // keeps a nested route from being swallowed by its parent.
      expect(sectionOf('/products')).toBe('catalog');
      expect(sectionOf('/products/import')).toBe('catalog');
    });

    it('keeps the catalogue separate from the stock on hand', () => {
      // A product's definition and its quantity are edited by different people
      // at different times, so they are different sections.
      expect(sectionOf('/products')).toBe('catalog');
      expect(sectionOf('/categories')).toBe('catalog');
      expect(sectionOf('/units')).toBe('catalog');
      expect(sectionOf('/stock')).toBe('inventory');
      expect(sectionOf('/product-waste')).toBe('inventory');
    });

    it('ignores query strings', () => {
      expect(sectionOf('/aging?tab=supplier')).toBe('reports');
    });

    it('returns null for the pinned screens, which live outside every section', () => {
      expect(sectionOf('/dashboard')).toBeNull();
      expect(sectionOf('/billing')).toBeNull();
    });

    it('toggles a section open and closed', () => {
      const open = component.isSectionOpen('inventory');
      component.toggleSection('inventory');
      expect(component.isSectionOpen('inventory')).toBe(!open);
      component.toggleSection('inventory');
      expect(component.isSectionOpen('inventory')).toBe(open);
    });

    // ── Collapsible rail ──
    it('collapses and expands, and remembers which it was', () => {
      component.sidebarCollapsed = false;
      component.toggleCollapsed();
      expect(component.sidebarCollapsed).toBeTrue();
      expect(localStorage.getItem('nav.collapsed')).toBe('1');
      component.toggleCollapsed();
      expect(component.sidebarCollapsed).toBeFalse();
      expect(localStorage.getItem('nav.collapsed')).toBe('0');
    });

    it('floats a section beside the rail instead of expanding it', () => {
      // Collapsing is a request for screen space. Clicking a section must not
      // undo that — the children come out in a panel and the rail stays 64px.
      component.openSections.clear();
      component.sidebarCollapsed = true;

      component.toggleSection('money');

      expect(component.sidebarCollapsed).toBeTrue();
      expect(component.flyoutKey).toBe('money');
      expect(component.isSectionShown('money')).toBeTrue();
    });

    it('shows only the section asked for, and closes it on a second click', () => {
      component.sidebarCollapsed = true;
      component.toggleSection('buy');
      expect(component.isSectionShown('buy')).toBeTrue();
      expect(component.isSectionShown('sell')).toBeFalse();

      component.toggleSection('buy');
      expect(component.flyoutKey).toBeNull();
    });

    it('leaves the saved open/closed sections untouched while collapsed', () => {
      // The panel is a temporary look, not a change to how the sidebar is set
      // up — expanding again must show exactly what it showed before.
      component.openSections.clear();
      component.openSections.add('sell');
      component.sidebarCollapsed = true;

      component.toggleSection('reports');

      expect(component.openSections.has('reports')).toBeFalse();
      expect(component.openSections.has('sell')).toBeTrue();
    });

    it('drops the panel when the rail expands, so it cannot hang over the page', () => {
      component.sidebarCollapsed = true;
      component.toggleSection('catalog');
      expect(component.flyoutKey).toBe('catalog');

      component.toggleCollapsed();
      expect(component.flyoutKey).toBeNull();
    });

    it('drops the panel once a child is chosen', () => {
      component.sidebarCollapsed = true;
      component.toggleSection('inventory');
      component.closeSidebar();          // every nav link calls this
      expect(component.flyoutKey).toBeNull();
    });

    it('closes on a click outside the sidebar but not inside it', () => {
      component.sidebarCollapsed = true;
      component.toggleSection('sell');

      const inside = document.createElement('div');
      inside.className = 'sidebar';
      const child = document.createElement('button');
      inside.appendChild(child);
      document.body.appendChild(inside);
      component.onDocumentClick({ target: child } as unknown as MouseEvent);
      expect(component.flyoutKey).toBe('sell');

      component.onDocumentClick({ target: document.body } as unknown as MouseEvent);
      expect(component.flyoutKey).toBeNull();
      inside.remove();
    });

    it('persists open sections so the sidebar remembers how you work', () => {
      component.openSections.clear();
      component.toggleSection('money');
      const saved = JSON.parse(localStorage.getItem('nav.openSections') || '[]');
      expect(saved).toContain('money');
    });

    it('opens the section holding the page you navigate to', () => {
      component.openSections.clear();
      (component as any).openActiveSection('/expenses');
      expect(component.isSectionOpen('money')).toBeTrue();
    });

    it('marks the owning section as active so a closed fold still shows where you are', () => {
      const real = (component as any).router;
      (component as any).router = { url: '/aging' };
      try {
        expect(component.isSectionActive('reports')).toBeTrue();
        expect(component.isSectionActive('money')).toBeFalse();
      } finally {
        (component as any).router = real;
      }
    });
  });
});
