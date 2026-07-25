import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { PrintLanguage } from './tenant-settings.service';

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** Deep-merge the en + bn translation trees into a bilingual tree where each
 *  leaf becomes "English / বাংলা" (or the one that exists if the other is missing
 *  or identical). Reuses the real en/bn files, so it can never drift out of sync. */
function mergeBilingual(en: any, bn: any): any {
  const out: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(en ?? {}), ...Object.keys(bn ?? {})]);
  for (const k of keys) {
    const ev = en?.[k];
    const bv = bn?.[k];
    if (isObj(ev) || isObj(bv)) {
      out[k] = mergeBilingual(ev ?? {}, bv ?? {});
    } else {
      const e = (ev ?? bv ?? '') as string;
      const b = (bv ?? ev ?? '') as string;
      out[k] = e && b && e !== b ? `${e} / ${b}` : e || b;
    }
  }
  return out;
}

/**
 * Applies a DOCUMENT language to the current (print) view, independent of the
 * app UI language. ngx-translate is global, so callers should capture the
 * returned previous language and restore it when leaving the print view.
 *
 * 'bilingual' is synthesised once from the loaded en+bn files and registered as
 * its own 'bilingual' language, so every `| translate` label prints as
 * "English / বাংলা" with no template changes.
 */
@Injectable({ providedIn: 'root' })
export class PrintLanguageService {
  private bilingualReady = false;

  constructor(private translate: TranslateService) {}

  /** Switch the view to `lang`. Returns the previously active language so the
   *  caller can restore it (e.g. in ngOnDestroy). */
  async applyForView(lang: PrintLanguage): Promise<string> {
    const previous = this.translate.currentLang() ?? 'en';
    if (lang === 'bilingual') {
      await this.ensureBilingual();
      this.translate.use('bilingual');
    } else {
      this.translate.use(lang);
    }
    return previous;
  }

  /** Restore a previously active language (from applyForView). */
  restore(lang: string): void {
    if (lang) this.translate.use(lang);
  }

  private async ensureBilingual(): Promise<void> {
    if (this.bilingualReady) return;
    // reloadLang loads a language's file and emits its translations WITHOUT
    // switching the active language (unlike use()), so building the merged set
    // never disturbs the current view.
    const [en, bn] = await Promise.all([
      firstValueFrom(this.translate.reloadLang('en')),
      firstValueFrom(this.translate.reloadLang('bn')),
    ]);
    this.translate.setTranslation('bilingual', mergeBilingual(en, bn));
    this.bilingualReady = true;
  }
}
