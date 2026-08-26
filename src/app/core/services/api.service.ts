import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
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

    /** context lets a caller opt out of the global error toast (skipErrorToast())
     *  for a lookup where "not found" is a normal, expected state rather than
     *  a failure — e.g. "is there a shift open right now?". */
    get(url: string, params?: any, context?: HttpContext) {
        return this.http.get(this.baseUrl + url, { ...this.opts, params, context });
    }

    /** For a binary download (xlsx/csv export, etc.) — a plain get() would try
     *  to JSON-parse the response body and corrupt it. */
    getBlob(url: string, params?: any) {
        return this.http.get(this.baseUrl + url, { ...this.opts, params, responseType: 'blob' as const });
    }

    post(url: string, data: any) {
        return this.http.post(this.baseUrl + url, data, this.opts);
    }

    /** Same as post(), but emits HttpEvent progress ticks (e.g. upload byte
     *  count for a large file) so a caller can drive a progress bar instead
     *  of just waiting on a single response. */
    postWithProgress(url: string, data: any): Observable<HttpEvent<any>> {
        return this.http.post(this.baseUrl + url, data, { ...this.opts, reportProgress: true, observe: 'events' });
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
