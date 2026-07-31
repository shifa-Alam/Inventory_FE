import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
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
    sell:      ['/sales', '/sale-return', '/customers'],
    buy:       ['/purchase', '/purchases', '/purchase-return', '/suppliers'],
    inventory: ['/stock', '/stock-count', '/stock-ledger', '/product-waste'],
    catalog:   ['/products', '/products/import', '/categories', '/units'],
    money:     ['/customer-payment', '/supplier-payment', '/expenses', '/payment-ledger', '/shift'],
    reports:   ['/profit-loss', '/aging', '/operator-summary'],
    setup:     ['/settings', '/notifications', '/users', '/tenants'],
  };

  /** Routes flattened longest-first, so the most specific one wins. Without
   *  this, `/products/import` would be swallowed by `/products` and open the
   *  wrong section — order of declaration should not decide correctness. */
  private readonly SECTION_LOOKUP: Array<[string, string]> = Object
    .entries(this.SECTION_ROUTES)
    .flatMap(([key, routes]) => routes.map(r => [key, r] as [string, string]))
    .sort((a, b) => b[1].length - a[1].length);

  private static readonly OPEN_SECTIONS_KEY = 'nav.openSections';
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

  toggleSection(key: string): void {
    this.openSections.has(key) ? this.openSections.delete(key) : this.openSections.add(key);
    this.persistSections();
  }

  /** True when a collapsed section contains the current page — lets the header
   *  carry the active marker so you can still see where you are. */
  isSectionActive(key: string): boolean { return this.sectionOf(this.router.url) === key; }

  closeSubPopup() { this.subPopup = null; }

  get isSystemAdmin(): boolean { return this.currentUser?.role === 'system_admin'; }
  /** Owner or Manager — sees purchases, returns, stock, reports, suppliers. */
  get canManage(): boolean { return this.auth.canManage(); }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
  closeSidebar()  { this.sidebarOpen = false; }

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
