import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';

export type InvoiceTemplate = 'classic' | 'compact' | 'thermal';
/** Document print language — independent of the app UI language. */
export type PrintLanguage = 'en' | 'bn' | 'bilingual';
/** Physical print medium; null = derive from invoice_template. */
export type PaperSize = 'a4' | '80mm' | '58mm' | 'dotmatrix' | null;
export type CurrencyPosition = 'before' | 'after';
/** App UI language the tenant defaults to (a user may override per-session). */
export type AppLanguage = 'en' | 'bn';
export type TimeFormat = '12h' | '24h';
export type TaxMode = 'none' | 'inclusive' | 'exclusive';
export type Align = 'left' | 'center' | 'right';

export interface InvoiceOptions {
    show_mrp: boolean;
    show_signature: boolean;
    show_status: boolean;
    show_paid_due: boolean;
    show_footer_contact: boolean;
    /** বাংলা / bilingual printing (see PrintLanguageService). */
    print_language: PrintLanguage;
    bangla_digits: boolean;
    paper_size: PaperSize;
    // ── Self-service invoice content toggles ──
    show_qr: boolean;
    show_barcode: boolean;
    show_customer: boolean;
    show_salesperson: boolean;
    show_sku: boolean;
    show_discount: boolean;
    show_savings: boolean;
    show_terms: boolean;
    invoice_title: string | null;
    terms_text: string | null;
    invoice_copies: number;
    auto_print: boolean;
    currency_symbol: string;
    currency_position: CurrencyPosition;
}

/** Broad self-service preferences (business / general / printing / branding). */
export interface TenantSettings {
    // Business information
    business_description: string | null;
    mobile: string | null;
    website: string | null;
    tax_info: string | null;
    bin_vat: string | null;
    trade_license: string | null;
    // General
    currency: string;
    default_language: AppLanguage;
    timezone: string;
    date_format: string;
    time_format: TimeFormat;
    decimal_precision: number;
    number_format: string;
    tax_mode: TaxMode;
    receipt_footer: string | null;
    // Printing preferences
    thermal_margin: number;
    font_size: number;
    header_align: Align;
    footer_align: Align;
    print_preview: boolean;
    // Branding (paths persisted by the upload endpoints; kept raw so the
    // wholesale settings PUT round-trips them unchanged — resolve for display
    // with resolveAssetUrl()).
    invoice_logo: string | null;
    favicon: string | null;
    banner: string | null;
}

export interface TenantInvoiceSettings {
    /** Unique tenant code (e.g. 'at_01') — resolves a bespoke invoice template. */
    code: string | null;
    business_type: string;
    invoice_template: InvoiceTemplate;
    /** Empty strings fall back to the i18n invoice.company* keys in the templates. */
    shop_name: string;
    shop_sub: string;
    address: string;
    phone: string;
    email: string;
    /** Absolute, display-ready URL (resolved against the API origin). */
    logo_url: string | null;
    accent_color: string;
    footer_note: string;
    options: InvoiceOptions;
    settings: TenantSettings;
    /** Editable profile fields the Settings page binds to. */
    name: string;
    tagline: string;
}

/** A partial payload for the self-service PUT — any omitted field is left as-is. */
export type TenantSettingsUpdate = Partial<{
    name: string;
    business_type: string;
    invoice_template: InvoiceTemplate;
    phone: string;
    email: string;
    address: string;
    tagline: string;
    accent_color: string;
    footer_note: string;
    logo: string;
    invoice_options: InvoiceOptions;
    settings: TenantSettings;
}>;

export const DEFAULT_INVOICE_OPTIONS: InvoiceOptions = {
    show_mrp: true,
    show_signature: true,
    show_status: true,
    show_paid_due: true,
    show_footer_contact: true,
    print_language: 'en',
    bangla_digits: false,
    paper_size: null,
    show_qr: false,
    show_barcode: false,
    show_customer: true,
    show_salesperson: false,
    show_sku: false,
    show_discount: true,
    show_savings: false,
    show_terms: false,
    invoice_title: null,
    terms_text: null,
    invoice_copies: 1,
    auto_print: false,
    currency_symbol: '৳',
    currency_position: 'before',
};

export const DEFAULT_TENANT_SETTINGS: TenantSettings = {
    business_description: null,
    mobile: null,
    website: null,
    tax_info: null,
    bin_vat: null,
    trade_license: null,
    currency: 'BDT',
    default_language: 'en',
    timezone: 'Asia/Dhaka',
    date_format: 'dd MMM yyyy',
    time_format: '12h',
    decimal_precision: 2,
    number_format: '1,234.56',
    tax_mode: 'none',
    receipt_footer: null,
    thermal_margin: 0,
    font_size: 12,
    header_align: 'center',
    footer_align: 'center',
    print_preview: true,
    invoice_logo: null,
    favicon: null,
    banner: null,
};

export const DEFAULT_INVOICE_SETTINGS: TenantInvoiceSettings = {
    code: null,
    business_type: 'B2C',
    invoice_template: 'classic',
    shop_name: '',
    shop_sub: '',
    address: '',
    phone: '',
    email: '',
    logo_url: null,
    accent_color: '#0f172a',
    footer_note: '',
    options: { ...DEFAULT_INVOICE_OPTIONS },
    settings: { ...DEFAULT_TENANT_SETTINGS },
    name: '',
    tagline: '',
};

/** Assets uploadable via POST /tenants/me/branding/<asset>. */
export type BrandingAsset = 'logo' | 'invoice_logo' | 'favicon' | 'banner';

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

    /** Save the self-service settings (admin only) and refresh the session cache. */
    saveSettings(payload: TenantSettingsUpdate): Observable<TenantInvoiceSettings> {
        return this.api.put('/tenants/me/settings', payload).pipe(
            map((res: any) => this.normalize(res)),
            tap((s) => { this.settings$ = of(s); })
        );
    }

    /** Upload one branding image; the response is the refreshed settings. */
    uploadBranding(asset: BrandingAsset, file: File): Observable<TenantInvoiceSettings> {
        const form = new FormData();
        form.append('file', file);
        return this.api.post(`/tenants/me/branding/${asset}`, form).pipe(
            map((res: any) => this.normalize(res)),
            tap((s) => { this.settings$ = of(s); })
        );
    }

    /** Force a re-fetch on the next getSettings() (e.g. after login/logout). */
    clearCache(): void {
        this.settings$ = undefined;
    }

    /**
     * Turn a stored branding path into a display-ready URL. Uploaded assets are
     * root-relative (`/uploads/...`) so the DB stays host-agnostic:
     *   - dev  (apiUrl is absolute) → prefix the API origin (…:8000)
     *   - prod (apiUrl is relative) → keep it same-origin (proxy routes /uploads)
     * Absolute URLs (a manually-entered logo link) pass through untouched.
     */
    resolveAssetUrl(path: string | null | undefined): string | null {
        if (!path) return null;
        if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
        return this.assetBase() + path;
    }

    private assetBase(): string {
        try {
            return new URL(environment.apiUrl).origin;   // absolute apiUrl (dev)
        } catch {
            return '';                                     // relative apiUrl (prod)
        }
    }

    private normalize(res: any): TenantInvoiceSettings {
        const merged: TenantInvoiceSettings = {
            ...DEFAULT_INVOICE_SETTINGS,
            ...(res ?? {}),
            options: { ...DEFAULT_INVOICE_OPTIONS, ...(res?.options ?? {}) },
            settings: { ...DEFAULT_TENANT_SETTINGS, ...(res?.settings ?? {}) },
        };
        // Only logo_url is resolved to an absolute URL — it is display-only and
        // never sent back. The settings-blob branding paths stay raw so the
        // wholesale settings PUT preserves them.
        merged.logo_url = this.resolveAssetUrl(merged.logo_url);
        return merged;
    }
}
