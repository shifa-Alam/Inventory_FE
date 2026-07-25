import { Pipe, PipeTransform } from '@angular/core';

/** Bengali digit glyphs, indexed 0-9. */
const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

function toBanglaDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => BN_DIGITS[+d]);
}

/** Bangladeshi/South-Asian grouping: last 3 digits, then groups of 2
 *  (১২,৩৪,৫৬৭). Operates on a pure integer string. */
function groupBD(intStr: string): string {
  if (intStr.length <= 3) return intStr;
  const head = intStr.slice(0, -3);
  const tail = intStr.slice(-3);
  return head.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + tail;
}

/**
 * Convert ASCII digits in any value to Bangla digits when `enabled`.
 * Display/print only — never mutate stored data or export/barcode payloads.
 * Usage: {{ value | bnDigit:settings.options.bangla_digits }}
 */
@Pipe({ name: 'bnDigit', standalone: true, pure: true })
export class BnDigitPipe implements PipeTransform {
  transform(value: string | number | null | undefined, enabled = true): string {
    if (value === null || value === undefined || value === '') return '';
    const s = String(value);
    return enabled ? toBanglaDigits(s) : s;
  }
}

/**
 * Format a money amount for documents: BD grouping, 2 decimals, optional ৳
 * symbol and optional Bangla digits. Negatives use a proper minus sign.
 * Usage: {{ amount | money:bangla_digits }}  →  "৳ ১২,৫০০.০০"
 *        {{ amount | money:false:false }}     →  "12,500.00" (no symbol)
 */
@Pipe({ name: 'money', standalone: true, pure: true })
export class MoneyPipe implements PipeTransform {
  transform(
    value: number | string | null | undefined,
    bangla = false,
    symbol = true,
  ): string {
    const n = Number(value ?? 0);
    const safe = Number.isFinite(n) ? n : 0;
    const [intPart, decPart] = Math.abs(safe).toFixed(2).split('.');
    let out = groupBD(intPart) + '.' + decPart;
    if (bangla) out = toBanglaDigits(out);
    if (symbol) out = '৳ ' + out;
    return (safe < 0 ? '−' : '') + out;
  }
}
