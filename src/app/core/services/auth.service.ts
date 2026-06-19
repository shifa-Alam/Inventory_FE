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

    logout() {
        localStorage.removeItem('token');
    }

    getCurrentUser(): { username: string; role: string } | null {
        const token = this.getToken();
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return { username: payload.sub ?? '', role: payload.role ?? '' };
        } catch {
            return null;
        }
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