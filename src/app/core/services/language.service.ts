import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  /** Explicit per-user choice (set by the toggle). Always wins. */
  private readonly STORAGE_KEY = 'app_lang';
  /** Last known tenant default — applied when the user hasn't overridden. */
  private readonly TENANT_KEY = 'tenant_default_lang';

  constructor(private translate: TranslateService) {
    // Precedence: the user's own override → the tenant default → English.
    const lang =
      localStorage.getItem(this.STORAGE_KEY) ||
      localStorage.getItem(this.TENANT_KEY) ||
      'en';
    this.translate.use(lang);
    this.applyBodyClass(lang);
  }

  get currentLang(): string {
    return this.translate.currentLang() ?? 'en';
  }

  /** True once the user has explicitly picked a language for themselves. */
  hasUserOverride(): boolean {
    return !!localStorage.getItem(this.STORAGE_KEY);
  }

  toggle() {
    const next = this.currentLang === 'en' ? 'bn' : 'en';
    this.set(next);
  }

  /** Explicit per-user choice — persisted and honoured over the tenant default. */
  set(lang: string) {
    this.translate.use(lang);
    localStorage.setItem(this.STORAGE_KEY, lang);
    this.applyBodyClass(lang);
  }

  /**
   * Apply the tenant's configured default language. Remembered (so it also
   * takes effect on a later refresh), but only actually switches the UI when
   * the user has NOT set their own override — an individual choice always wins.
   */
  applyTenantDefault(lang: string | null | undefined) {
    if (!lang) return;
    localStorage.setItem(this.TENANT_KEY, lang);
    if (this.hasUserOverride()) return;
    this.translate.use(lang);
    this.applyBodyClass(lang);
  }

  private applyBodyClass(lang: string) {
    document.body.classList.toggle('lang-bn', lang === 'bn');
  }
}
