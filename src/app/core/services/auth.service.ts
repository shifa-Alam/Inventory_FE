import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({
    providedIn: 'root'
})
export class AuthService {

    constructor(private api: ApiService) { }

    login(data: any) {
        return this.api.post('/auth/login', data);
    }

    setToken(token: string) {
        localStorage.setItem('token', token);
    }

    getToken() {
        return localStorage.getItem('token');
    }

    isLoggedIn(): boolean {
        return !!localStorage.getItem('token');
    }

    isTokenValid(): boolean {
        const token = this.getToken();
        if (!token) return false;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (!payload.exp) return true;
            return payload.exp * 1000 > Date.now();
        } catch {
            return false;
        }
    }

    logout() {
        localStorage.removeItem('token');
    }

    getCurrentUser(): { username: string; role: string; tenant_id: number | null } | null {
        const token = this.getToken();
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return {
                username: payload.sub ?? '',
                role: payload.role ?? '',
                tenant_id: payload.tenant_id ?? null,
            };
        } catch {
            return null;
        }
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
}