import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SubscriptionStatus {
  status: 'ACTIVE' | 'GRACE' | 'READ_ONLY';
  expires_on: string | null;
  days_remaining: number | null;
  grace_days_remaining: number | null;
  grace_days: number;
  warning: boolean;
  message: string | null;
}

/**
 * Single source of subscription state on the client.
 *
 * - Login stores the status returned by /auth/login and queues its message
 *   as a one-time popup (shown by the layout after navigation).
 * - The layout also calls refresh() on load, so a page reload still knows
 *   about read-only mode without re-login.
 * - The backend middleware is the real enforcement; everything here is UX.
 */
@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private baseUrl = environment.apiUrl;

  readonly status$ = new BehaviorSubject<SubscriptionStatus | null>(null);
  /** Message to show once in a popup right after login (null = nothing). */
  private pendingPopup: string | null = null;

  constructor(private http: HttpClient) {}

  get status(): SubscriptionStatus | null { return this.status$.value; }
  get isReadOnly(): boolean { return this.status?.status === 'READ_ONLY'; }
  get isInGrace(): boolean { return this.status?.status === 'GRACE'; }

  /** Store the login response's subscription block; queue its popup. */
  setFromLogin(sub: SubscriptionStatus | null) {
    this.status$.next(sub);
    this.pendingPopup = sub?.message ?? null;
  }

  /** One-shot: the layout takes the popup exactly once per login. */
  consumePopup(): string | null {
    const msg = this.pendingPopup;
    this.pendingPopup = null;
    return msg;
  }

  /** Re-check on app load (reload keeps the banner without a new login). */
  refresh() {
    this.http.get<SubscriptionStatus>(`${this.baseUrl}/subscription/status`, { withCredentials: true })
      .subscribe({
        next: s => this.status$.next(s),
        error: () => {}   // system_admin (403) / offline — leave state as-is
      });
  }

  /** Called by the interceptor when the backend rejects a write with 403. */
  markReadOnly() {
    const current = this.status;
    if (current?.status !== 'READ_ONLY') {
      this.status$.next({
        status: 'READ_ONLY',
        expires_on: current?.expires_on ?? null,
        days_remaining: null,
        grace_days_remaining: 0,
        grace_days: current?.grace_days ?? 3,
        warning: false,
        message: null,
      });
    }
  }
}
