import {
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpContextToken,
  HttpContext,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastService } from '../../shared/services/toast.service';
import { SubscriptionService } from '../services/subscription.service';

/**
 * Global HTTP error handling — the single source of error toasts.
 *
 * Every failed API call surfaces a proper, human-readable message as a toast,
 * so no request can ever fail silently. This replaces scattered per-call
 * try/catch: components only need to handle their own side-effects (resetting
 * loading flags etc.); they no longer have to build an error message.
 *
 * A request can opt out (e.g. login shows an inline error instead) by passing
 * `{ context: skipErrorToast() }` as the HttpClient options.
 */
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

export function skipErrorToast(): HttpContext {
  return new HttpContext().set(SKIP_ERROR_TOAST, true);
}

/** Turn any backend/network error into one clear sentence for the user. */
function extractMessage(err: HttpErrorResponse): string {
  // status 0 → request never reached the server (offline, CORS, DNS…).
  if (err.status === 0) {
    return 'Unable to reach the server. Please check your connection.';
  }

  const detail = err.error?.detail;

  // FastAPI validation errors arrive as detail = [{ loc, msg, type }, …].
  if (Array.isArray(detail)) {
    const first = detail[0];
    if (first?.msg) {
      const field = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : '';
      const msg = String(first.msg).replace(/^value error,?\s*/i, '');
      return field && field !== 'body' ? `${field}: ${msg}` : msg;
    }
    return 'Please check the form and try again.';
  }

  // Normal business error: { detail: "Not enough stock for X" }.
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (typeof err.error?.message === 'string' && err.error.message.trim()) {
    return err.error.message;
  }

  // Generic, friendly fallbacks by status code.
  const byStatus: Record<number, string> = {
    400: 'Invalid request. Please check your input.',
    403: 'You do not have permission to do that.',
    404: 'The requested item was not found.',
    409: 'This action conflicts with existing data.',
    413: 'The uploaded file is too large.',
    422: 'Please check the form and try again.',
    429: 'Too many requests — please slow down and try again.',
    500: 'A server error occurred. Please try again.',
    502: 'The server is temporarily unavailable. Please try again shortly.',
    503: 'The server is temporarily unavailable. Please try again shortly.',
    504: 'The server took too long to respond. Please try again.',
  };
  return byStatus[err.status] || err.message || 'Something went wrong. Please try again.';
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  const subs = inject(SubscriptionService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const skip = req.context.get(SKIP_ERROR_TOAST);

      // 401 is handled by authInterceptor (silent token refresh); toasting it
      // here would flash an error during a refresh that is about to succeed.
      if (!skip && err.status !== 401) {
        // Subscription past its grace period → flip the whole UI to read-only.
        if (
          err.status === 403 &&
          typeof err.error?.detail === 'string' &&
          err.error.detail.startsWith('Subscription expired')
        ) {
          subs.markReadOnly();
        }
        toast.error(extractMessage(err));
      }

      // Re-throw so component error callbacks still run their side-effects.
      return throwError(() => err);
    })
  );
};
