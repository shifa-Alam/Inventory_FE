import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../core/services/language.service';
import { AuthService } from '../core/services/auth.service';
import { SubscriptionService } from '../core/services/subscription.service';
import { TenantSettingsService } from '../core/services/tenant-settings.service';
import { ToastComponent } from '../shared/components/toast/toast.component';
import { ConfirmModalComponent } from '../shared/components/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe, ToastComponent, ConfirmModalComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent {
  sidebarOpen = false;
  isDark = false;
  /** One-time popup after login (expiry warning / grace / read-only). */
  subPopup: string | null = null;
  currentUser: { username: string; role: string; tenant_id: number | null } | null = null;
  /** The tenant this session belongs to — account context for the sidebar/topbar
   *  chip, separate from the "Snova POS" product branding. Stays null for
   *  system_admin (platform role, owns no tenant) and for a tenant that has no
   *  name set, so the chip simply does not render. */
  tenantName: string | null = null;

  /**
   * Collapsible sidebar sections, keyed to the routes each one owns.
   *
   * The sidebar carries ~29 destinations. Showing them all at once buried the
   * two screens people actually live in, so Dashboard and New Sale are pinned
   * above these and everything else folds away. The route list lets a section
   * open itself when you are inside it — including on a hard refresh or a
   * deep link, where there is no click to react to.
   *
   * Order here is the order on screen: daily work first, configuration last.
   */
  private readonly SECTION_ROUTES: Record<string, string[]> = {
    // Grouped by the job being done, not by the type of record. That is why
    // Customers sits under selling and Suppliers under buying: you reach for
    // a supplier while receiving stock, not while thinking "people". The
    // earlier object-based split (a "People" bucket holding both) forced you
    // to leave the task you were in to find the party you were dealing with.
    //
    // Three deliberate departures from that rule:
    //
    //  * Every payment lives in MONEY. Taking money from a customer and paying
    //    a supplier were previously filed under selling and buying, with the
    //    ledger under a third heading — three places to remember for one job.
    //    Collecting dues is its own task, usually done in a batch and often by
    //    a different person than the one at the counter. The master records
    //    (Customers, Suppliers) stay where the work is.
    //
    //  * CATALOG and INVENTORY are split. A product's definition (name, price,
    //    category, unit) and its quantity on hand are edited by different
    //    people at different times. Categories and Units moved out of setup:
    //    they are part of the catalogue, not application configuration.
    //
    //  * Stock Ledger moved out of reports into INVENTORY. It is not something
    //    you read on a schedule — it is where you go when a stock figure looks
    //    wrong, which is a stock task.
    // '/sales' and '/products' are pinned above the sections (see the
    // template), not owned by any collapsible one.
    sell:      ['/sale-return', '/customers'],
    buy:       ['/purchase', '/purchases', '/purchase-return', '/suppliers'],
    inventory: ['/stock', '/stock-count', '/stock-ledger', '/product-waste'],
    // Money and Reports merged into one section — seven sections was too
    // many folders to search through for one that only opens on click
    // anyway, and both are "how is the business doing" reading, just at
    // different cadences (payments daily, reports weekly).
    money:     ['/customer-payment', '/supplier-payment', '/expenses', '/payment-ledger', '/shift',
                '/profit-loss', '/aging', '/operator-summary'],
    // Catalog folded into Setup: Products (the item people actually look
    // up) is pinned above, so what is left here — Categories, Units, Import
    // — is occasional configuration, the same cadence as the rest of Setup.
    setup:     ['/settings', '/notifications', '/users', '/tenants',
                '/categories', '/units', '/products/import'],
  };

  /** Routes flattened longest-first, so the most specific one wins. Without
   *  this, `/products/import` would be swallowed by `/products` and open the
   *  wrong section — order of declaration should not decide correctness. */
  private readonly SECTION_LOOKUP: Array<[string, string]> = Object
    .entries(this.SECTION_ROUTES)
    .flatMap(([key, routes]) => routes.map(r => [key, r] as [string, string]))
    .sort((a, b) => b[1].length - a[1].length);

  private static readonly OPEN_SECTIONS_KEY = 'nav.openSections';
  private static readonly COLLAPSED_KEY = 'nav.collapsed';

  /**
   * Icon-only sidebar. Desktop concept only — below 1025px the sidebar is
   * already an off-canvas drawer, so there is nothing to collapse.
   *
   * Kept out of the section state deliberately: which sections you leave open
   * is about how you work, whether the rail is collapsed is about how much
   * screen you want. Restoring one should not disturb the other.
   */
  sidebarCollapsed = false;
  openSections = new Set<string>();

  constructor(
    public lang: LanguageService,
    public auth: AuthService,
    public subs: SubscriptionService,
    private tenantSettings: TenantSettingsService,
    private router: Router
  ) {
    this.currentUser = this.auth.getCurrentUser();
    this.isDark = localStorage.getItem('theme') === 'dark';
    this.applyTheme();
    this.restoreSections();
    this.restoreCollapsed();
    // Deep links and in-app navigation both land here, so the owning section
    // opens itself either way.
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => this.openActiveSection(e.urlAfterRedirects));
    if (!this.isSystemAdmin) {
      this.subPopup = this.subs.consumePopup();   // set only right after login
      this.subs.refresh();                        // reload-safe banner state
      // Session-cached in the service (shareReplay), so this costs one request
      // per login, not one per navigation. It also swallows its own errors and
      // falls back to defaults — hence no error branch, just an empty name.
      this.tenantSettings.getSettings().subscribe((s) => {
        this.tenantName = s.shop_name || null;
      });
    }
  }

  // ── Collapsible sections ───────────────────────────────────────────────

  /** Which section owns a URL. Matches exact or child paths only, so
   *  `/stock-count` is not mistaken for `/stock` and `/purchases` is not
   *  mistaken for `/purchase`. */
  private sectionOf(url: string): string | null {
    const path = (url || '').split('?')[0];
    for (const [key, route] of this.SECTION_LOOKUP) {
      if (path === route || path.startsWith(route + '/')) return key;
    }
    return null;
  }

  private restoreSections(): void {
    try {
      const saved = JSON.parse(localStorage.getItem(LayoutComponent.OPEN_SECTIONS_KEY) || '[]');
      if (Array.isArray(saved)) this.openSections = new Set(saved.filter(k => k in this.SECTION_ROUTES));
    } catch { /* corrupt value — fall back to just the active section */ }
    // Whatever was restored, the section you are standing in must be open,
    // otherwise the highlighted page is hidden inside a collapsed header.
    this.openActiveSection(this.router.url);
  }

  private openActiveSection(url: string): void {
    const key = this.sectionOf(url);
    if (key && !this.openSections.has(key)) {
      this.openSections.add(key);
      this.persistSections();
    }
  }

  private persistSections(): void {
    try {
      localStorage.setItem(LayoutComponent.OPEN_SECTIONS_KEY,
                           JSON.stringify([...this.openSections]));
    } catch { /* private mode / quota — the nav still works, it just forgets */ }
  }

  isSectionOpen(key: string): boolean { return this.openSections.has(key); }

  /**
   * Section whose children are floating beside the rail, or null.
   *
   * Only meaningful while collapsed. Driven by click rather than hover so it
   * works with a keyboard and on a touch screen, and so it stays open while you
   * travel across to it — a hover panel that closes when the pointer crosses
   * the gap is worse than no panel.
   */
  flyoutKey: string | null = null;

  toggleSection(key: string): void {
    // Collapsed, the rail is 64px and cannot show a child list inline — so the
    // children float out beside it instead. Expanding the whole sidebar here
    // would defeat the point of having collapsed it.
    if (this.sidebarCollapsed) {
      this.flyoutKey = this.flyoutKey === key ? null : key;
      return;
    }
    this.openSections.has(key) ? this.openSections.delete(key) : this.openSections.add(key);
    this.persistSections();
  }

  /** True when this section's children should be in the DOM: either the section
   *  is open in the normal sidebar, or it is the one floating beside the rail. */
  isSectionShown(key: string): boolean {
    return this.sidebarCollapsed ? this.flyoutKey === key : this.openSections.has(key);
  }

  closeFlyout(): void { this.flyoutKey = null; }

  /** Anywhere outside the sidebar dismisses the panel — the usual contract for
   *  something that floats over the page. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.flyoutKey) return;
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.sidebar')) this.closeFlyout();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.closeFlyout(); }

  toggleCollapsed(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    // A panel floating beside a rail that is no longer there would hang in
    // mid-air over the page.
    this.flyoutKey = null;
    this.persistCollapsed();
  }

  private persistCollapsed(): void {
    try {
      localStorage.setItem(LayoutComponent.COLLAPSED_KEY, this.sidebarCollapsed ? '1' : '0');
    } catch { /* private mode / quota — the rail still works, it just forgets */ }
  }

  private restoreCollapsed(): void {
    try {
      this.sidebarCollapsed = localStorage.getItem(LayoutComponent.COLLAPSED_KEY) === '1';
    } catch { /* same as above */ }
  }

  /** True when a collapsed section contains the current page — lets the header
   *  carry the active marker so you can still see where you are. */
  isSectionActive(key: string): boolean { return this.sectionOf(this.router.url) === key; }

  closeSubPopup() { this.subPopup = null; }

  get isSystemAdmin(): boolean { return this.currentUser?.role === 'system_admin'; }
  /** Owner or Manager — sees purchases, returns, stock, reports, suppliers. */
  get canManage(): boolean { return this.auth.canManage(); }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
  // Every nav link calls this, so it is also where the floating panel gets
  // dismissed once you have picked something out of it.
  closeSidebar()  { this.sidebarOpen = false; this.flyoutKey = null; }

  toggleTheme() {
    this.isDark = !this.isDark;
    localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
    this.applyTheme();
  }

  private applyTheme() {
    document.body.classList.toggle('dark', this.isDark);
  }

  logout() {
    this.auth.logout().subscribe({
      next:  () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
