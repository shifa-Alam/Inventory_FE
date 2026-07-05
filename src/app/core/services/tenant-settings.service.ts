import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { ApiService } from './api.service';

export type InvoiceTemplate = 'classic' | 'compact' | 'thermal';

export interface InvoiceOptions {
    show_mrp: boolean;
    show_signature: boolean;
    show_status: boolean;
    show_paid_due: boolean;
    show_footer_contact: boolean;
}

export interface TenantInvoiceSettings {
    invoice_template: InvoiceTemplate;
    /** Empty strings fall back to the i18n invoice.company* keys in the templates. */
    shop_name: string;
    shop_sub: string;
    address: string;
    phone: string;
    email: string;
    logo_url: string | null;
    accent_color: string;
    footer_note: string;
    options: InvoiceOptions;
}

export const DEFAULT_INVOICE_SETTINGS: TenantInvoiceSettings = {
    invoice_template: 'classic',
    shop_name: '',
    shop_sub: '',
    address: '',
    phone: '',
    email: '',
    logo_url: null,
    accent_color: '#0f172a',
    footer_note: '',
    options: {
        show_mrp: true,
        show_signature: true,
        show_status: true,
        show_paid_due: true,
        show_footer_contact: true,
    },
};

@Injectable({ providedIn: 'root' })
export class TenantSettingsService {

    private settings$?: Observable<TenantInvoiceSettings>;

    constructor(private api: ApiService) {}

    /** Cached per session; falls back to defaults if the endpoint is unavailable. */
    getSettings(): Observable<TenantInvoiceSettings> {
        if (!this.settings$) {
            this.settings$ = this.api.get('/tenants/me/settings').pipe(
                map((res: any) => this.normalize(res)),
                catchError(() => of(DEFAULT_INVOICE_SETTINGS)),
                shareReplay(1)
            );
        }
        return this.settings$;
    }

    private normalize(res: any): TenantInvoiceSettings {
        return {
            ...DEFAULT_INVOICE_SETTINGS,
            ...(res ?? {}),
            options: { ...DEFAULT_INVOICE_SETTINGS.options, ...(res?.options ?? {}) },
        };
    }
}
