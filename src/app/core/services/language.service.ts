import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly STORAGE_KEY = 'app_lang';

  constructor(private translate: TranslateService) {
    const saved = localStorage.getItem(this.STORAGE_KEY) || 'en';
    this.translate.use(saved);
    this.applyBodyClass(saved);
  }

  get currentLang(): string {
    return this.translate.currentLang() ?? 'en';
  }

  toggle() {
    const next = this.currentLang === 'en' ? 'bn' : 'en';
    this.translate.use(next);
    localStorage.setItem(this.STORAGE_KEY, next);
    this.applyBodyClass(next);
  }

  private applyBodyClass(lang: string) {
    document.body.classList.toggle('lang-bn', lang === 'bn');
  }
}
