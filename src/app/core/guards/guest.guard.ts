import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Keeps already-authenticated users off the login page: a still-valid
 *  session skips /login and goes straight to its landing route. Mirrors the
 *  post-login navigation in LoginComponent (system_admin → Users, else
 *  Dashboard). */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isSessionValid()) {
    router.navigate([auth.isSystemAdmin() ? '/users' : '/dashboard']);
    return false;
  }
  return true;
};
