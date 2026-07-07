import {
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpRequest,
  HttpHandlerFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, throwError, Observable } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

// Shared state for concurrent 401 handling (module-level singletons).
let isRefreshing = false;
const refreshDone$ = new BehaviorSubject<boolean>(false);

function addCsrf(req: HttpRequest<unknown>, csrfToken: string | null): HttpRequest<unknown> {
  if (!csrfToken) return req;
  // Only mutating requests need CSRF protection.
  const safe = ['GET', 'HEAD', 'OPTIONS'];
  if (safe.includes(req.method)) return req;
  return req.clone({ setHeaders: { 'X-CSRF-Token': csrfToken } });
}

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: AuthService,
  router: Router
): Observable<any> {
  if (isRefreshing) {
    // Queue this request until the in-progress refresh resolves.
    return refreshDone$.pipe(
      filter(done => done),
      take(1),
      switchMap(() => next(addCsrf(req, auth.getCsrfToken())))
    );
  }

  isRefreshing = true;
  refreshDone$.next(false);

  return auth.refresh().pipe(
    switchMap(() => {
      isRefreshing = false;
      refreshDone$.next(true);
      return next(addCsrf(req, auth.getCsrfToken()));
    }),
    catchError(refreshErr => {
      isRefreshing = false;
      refreshDone$.next(false);
      auth.clearSession();
      router.navigate(['/login']);
      return throwError(() => refreshErr);
    })
  );
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth   = inject(AuthService);

  // Attach CSRF token to outgoing request.
  const outReq = addCsrf(req, auth.getCsrfToken());

  return next(outReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // On 401, attempt a silent token refresh — but not for the refresh or
      // login endpoints themselves (avoids infinite refresh loops).
      if (
        err.status === 401 &&
        !req.url.includes('/auth/refresh') &&
        !req.url.includes('/auth/login')
      ) {
        return handle401(req, next, auth, router);
      }
      return throwError(() => err);
    })
  );
};
