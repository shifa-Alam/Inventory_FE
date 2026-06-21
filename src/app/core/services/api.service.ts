import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ApiService {

    baseUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    get(url: string) {
        return this.http.get(this.baseUrl + url);
    }

    post(url: string, data: any) {
        return this.http.post(this.baseUrl + url, data);
    }

    put(url: string, data: any) {
        return this.http.put(this.baseUrl + url, data);
    }

    patch(url: string, data: any) {
        return this.http.patch(this.baseUrl + url, data);
    }

    delete(url: string) {
        return this.http.delete(this.baseUrl + url);
    }

}