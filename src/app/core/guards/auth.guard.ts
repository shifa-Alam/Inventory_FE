import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// The platform system_admin may only reach Users and Tenants.
const SYSTEM_ADMIN_ALLOWED = ['/users', '/tenants'];

export const authGuard: CanActivateFn = (_route, state) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isSessionValid()) {
    router.navigate(['/login']);
    return false;
  }

  // Role-based route restriction for system_admin — any other path is denied
  // and bounced to Users (its landing page). Mirrors the backend 403 guard.
  if (auth.isSystemAdmin()) {
    const path = state.url.split('?')[0];
    const allowed = SYSTEM_ADMIN_ALLOWED.some(a => path === a || path.startsWith(a + '/'));
    if (!allowed) {
      router.navigate(['/users']);
      return false;
    }
  }

  return true;
};
