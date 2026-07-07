import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ApiService {

    baseUrl = environment.apiUrl;

    // withCredentials: true is required for the browser to send httpOnly
    // session cookies on cross-origin requests (dev: 4200 → 8000).
    private opts = { withCredentials: true };

    constructor(private http: HttpClient) { }

    get(url: string, params?: any) {
        return this.http.get(this.baseUrl + url, { ...this.opts, params });
    }

    post(url: string, data: any) {
        return this.http.post(this.baseUrl + url, data, this.opts);
    }

    put(url: string, data: any) {
        return this.http.put(this.baseUrl + url, data, this.opts);
    }

    patch(url: string, data: any) {
        return this.http.patch(this.baseUrl + url, data, this.opts);
    }

    delete(url: string) {
        return this.http.delete(this.baseUrl + url, this.opts);
    }
}
