import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// The platform system_admin may only reach Users and Tenants.
const SYSTEM_ADMIN_ALLOWED = ['/users', '/tenants'];

// Routes the cashier role may NOT open directly (mirrors the backend 403s).
// Everything else (dashboard, sales, products, customers, payments, shift…)
// stays reachable for cashiers.
const MANAGER_ONLY = [
  '/purchase', '/purchases', '/purchase-return',
  '/supplier-payment', '/payment-ledger', '/operator-summary',
  '/suppliers', '/sale-return', '/aging', '/profit-loss', '/stock', '/stock-ledger',
  '/stock-count', '/product-waste', '/expenses', '/categories', '/units', '/users',
  '/products/import', '/settings',
];

// Owner-only areas. Managers already pass MANAGER_ONLY, so anything here needs
// its own gate: Profit & Loss exposes the margin on every line the shop sells,
// which is the owner's business and not the floor manager's.
const ADMIN_ONLY = ['/profit-loss'];

export const authGuard: CanActivateFn = (_route, state) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isSessionValid()) {
    router.navigate(['/login']);
    return false;
  }

  const path = state.url.split('?')[0];

  // Role-based route restriction for system_admin — any other path is denied
  // and bounced to Users (its landing page). Mirrors the backend 403 guard.
  if (auth.isSystemAdmin()) {
    const allowed = SYSTEM_ADMIN_ALLOWED.some(a => path === a || path.startsWith(a + '/'));
    if (!allowed) {
      router.navigate(['/users']);
      return false;
    }
  }

  // Cashiers are bounced from manager-only areas back to the POS screen.
  if (auth.isCashier()) {
    const blocked = MANAGER_ONLY.some(a => path === a || path.startsWith(a + '/'));
    if (blocked) {
      router.navigate(['/billing']);
      return false;
    }
  }

  // Owner-only areas: everyone below admin goes back to the dashboard. This
  // mirrors the backend's finance.view permission — the menu hides the link,
  // but a typed URL has to be stopped too.
  if (!auth.isAdmin()) {
    const blocked = ADMIN_ONLY.some(a => path === a || path.startsWith(a + '/'));
    if (blocked) {
      router.navigate(['/dashboard']);
      return false;
    }
  }

  return true;
};
