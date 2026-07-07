import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

interface SessionInfo {
  username: string;
  role: string;
  tenant_id: number | null;
  exp: number; // Unix epoch seconds
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Session cookie helpers ────────────────────────────────────────────────

  /** Read a cookie value by name from document.cookie. */
  private getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    if (!match) return null;
    let value = decodeURIComponent(match[1]);
    // SimpleCookie (backend) quotes values containing special chars — strip them.
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    return value;
  }

  /** Parse the non-httpOnly session_info cookie (URL-safe base64 JSON, no padding). */
  getSessionInfo(): SessionInfo | null {
    const raw = this.getCookie('session_info');
    if (!raw) return null;
    try {
      const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
      return JSON.parse(atob(padded)) as SessionInfo;
    } catch {
      return null;
    }
  }

  /** Read the CSRF token from its non-httpOnly cookie for use as a header. */
  getCsrfToken(): string | null {
    return this.getCookie('csrf_token');
  }

  // ── Auth state ────────────────────────────────────────────────────────────

  /** True when session_info cookie exists and has not expired. */
  isSessionValid(): boolean {
    const info = this.getSessionInfo();
    if (!info) return false;
    return info.exp * 1000 > Date.now();
  }

  getCurrentUser(): SessionInfo | null {
    return this.getSessionInfo();
  }

  isSystemAdmin(): boolean {
    return this.getCurrentUser()?.role === 'system_admin';
  }

  getRoleLabel(role: string): string {
    const map: Record<string, string> = {
      system_admin: 'System Admin',
      admin: 'Admin',
      staff: 'Staff',
    };
    return map[role] ?? role;
  }

  // ── API calls ─────────────────────────────────────────────────────────────

  login(data: { username: string; password: string }): Observable<any> {
    // withCredentials so the browser stores the Set-Cookie headers from the response.
    return this.http.post(`${this.baseUrl}/auth/login`, data, { withCredentials: true });
  }

  /** Call the refresh endpoint — browser automatically sends the
   *  refresh_token httpOnly cookie (Path=/auth/refresh). */
  refresh(): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/refresh`, {}, { withCredentials: true });
  }

  /** Tell the backend to clear all auth cookies, then clear local state. */
  logout(): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/logout`, {}, { withCredentials: true });
  }

  /** Clear any local session state (used after a failed refresh). */
  clearSession(): void {
    // Session cookies are cleared by the backend on logout.
    // If called client-side without a server round-trip we can only
    // expire them; the httpOnly ones will persist until the browser
    // drops them (max_age reached) but they will be rejected by the server.
    // Nothing to clear from localStorage in the new cookie-only design.
  }

  // ── Legacy compatibility shims (remove after full migration) ──────────────
  // These are kept so any component still calling setToken / getToken / isLoggedIn
  // compiles without changes. They are no-ops in the cookie model.

  /** @deprecated — tokens are now managed via httpOnly cookies */
  setToken(_token: string): void { /* no-op */ }

  /** @deprecated */
  getToken(): string | null { return null; }

  /** @deprecated — use isSessionValid() */
  isLoggedIn(): boolean { return this.isSessionValid(); }

  /** @deprecated — use isSessionValid() */
  isTokenValid(): boolean { return this.isSessionValid(); }
}
