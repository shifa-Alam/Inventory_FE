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
  '/suppliers', '/sale-return', '/aging', '/stock', '/stock-ledger',
  '/stock-count', '/product-waste', '/expenses', '/categories', '/units', '/users',
];

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

  return true;
};
