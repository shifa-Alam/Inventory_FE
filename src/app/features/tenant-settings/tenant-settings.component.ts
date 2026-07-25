import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { ToastService } from '../../shared/services/toast.service';
import {
  TenantSettingsService, TenantInvoiceSettings, TenantSettingsUpdate,
  BrandingAsset, DEFAULT_INVOICE_SETTINGS,
} from '../../core/services/tenant-settings.service';

/**
 * Tenant self-service Settings — a shop owner configures the appearance,
 * branding, language and printing behaviour of their own POS. Reads/writes
 * /tenants/me/settings (+ /tenants/me/branding/<asset> for image uploads).
 * Admin/owner only; managers & cashiers see a read-only notice.
 */
@Component({
  selector: 'app-tenant-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './tenant-settings.component.html',
  styleUrls: ['./tenant-settings.component.css'],
})
export class TenantSettingsComponent implements OnInit {
  // Editable working copy (a deep clone so we never mutate the service cache).
  model: TenantInvoiceSettings = structuredClone(DEFAULT_INVOICE_SETTINGS);
  loading = true;
  saving = false;
  isAdmin = false;
  uploading: Record<string, boolean> = {};

  // Fixed option lists surfaced in <select>s.
  readonly paperSizes = [
    { value: null, key: 'settings.paper_auto' },
    { value: 'a4', key: 'settings.paper_a4' },
    { value: '80mm', key: 'settings.paper_80mm' },
    { value: '58mm', key: 'settings.paper_58mm' },
  ];
  readonly templates: Array<'classic' | 'compact' | 'thermal'> = ['classic', 'compact', 'thermal'];
  readonly aligns: Array<'left' | 'center' | 'right'> = ['left', 'center', 'right'];

  constructor(
    public tenantSettings: TenantSettingsService,
    private auth: AuthService,
    private toast: ToastService,
    private translate: TranslateService,
    private language: LanguageService,
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.auth.isAdmin();
    this.tenantSettings.getSettings().subscribe({
      next: (s) => { this.model = structuredClone(s); this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  save(): void {
    if (!this.isAdmin) return;
    this.saving = true;
    const payload: TenantSettingsUpdate = {
      name: this.model.name,
      tagline: this.model.tagline,
      business_type: this.model.business_type,
      invoice_template: this.model.invoice_template,
      phone: this.model.phone,
      email: this.model.email,
      address: this.model.address,
      accent_color: this.model.accent_color,
      footer_note: this.model.footer_note,
      invoice_options: this.model.options,
      settings: this.model.settings,
    };
    this.tenantSettings.saveSettings(payload).subscribe({
      next: (s) => {
        // Re-clone from the server so derived fields (shop_name, resolved
        // logo_url) reflect the saved state.
        this.model = structuredClone(s);
        this.saving = false;
        // Apply the tenant default language immediately (respects a user's
        // own override, which always wins).
        this.language.applyTenantDefault(s.settings.default_language);
        this.toast.success(this.translate.instant('settings.saved'));
      },
      error: (err: any) => {
        this.saving = false;
        this.toast.error(err?.error?.detail || this.translate.instant('settings.save_failed'));
      },
    });
  }

  onFile(asset: BrandingAsset, ev: Event): void {
    if (!this.isAdmin) return;
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';                       // allow re-picking the same file
    if (!file) return;
    this.uploading[asset] = true;
    this.tenantSettings.uploadBranding(asset, file).subscribe({
      next: (s) => {
        // Only refresh the branding-related fields so unsaved edits elsewhere
        // on the form survive the upload.
        this.model.logo_url = s.logo_url;
        this.model.settings.invoice_logo = s.settings.invoice_logo;
        this.model.settings.favicon = s.settings.favicon;
        this.model.settings.banner = s.settings.banner;
        this.uploading[asset] = false;
        this.toast.success(this.translate.instant('settings.upload_ok'));
      },
      error: (err: any) => {
        this.uploading[asset] = false;
        this.toast.error(err?.error?.detail || this.translate.instant('settings.upload_failed'));
      },
    });
  }

  /** Display URL for a branding asset stored on the model. */
  assetUrl(path: string | null | undefined): string | null {
    return this.tenantSettings.resolveAssetUrl(path);
  }
}
