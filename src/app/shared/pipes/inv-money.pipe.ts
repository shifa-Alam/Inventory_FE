import { Pipe, PipeTransform } from '@angular/core';
import { TenantInvoiceSettings } from '../../core/services/tenant-settings.service';

const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/**
 * Formats a money amount for invoices honouring the tenant's configured
 * currency symbol, currency position, decimal precision and Bangla-digit
 * preference — so a single binding respects four settings at once.
 *
 *   {{ item.rate | invMoney:settings }}          → "৳ 1,250.00"
 *   {{ item.rate | invMoney:settings:false }}    → "1,250.00" (no symbol)
 */
@Pipe({ name: 'invMoney', standalone: true, pure: true })
export class InvMoneyPipe implements PipeTransform {
  transform(value: number | null | undefined, settings: TenantInvoiceSettings, withSymbol = true): string {
    const opts = settings?.options;
    const prec = settings?.settings?.decimal_precision ?? 2;
    let num = Number(value ?? 0).toLocaleString('en-US', {
      minimumFractionDigits: prec,
      maximumFractionDigits: prec,
    });
    if (opts?.bangla_digits) {
      num = num.replace(/[0-9]/g, (d) => BANGLA_DIGITS[+d]);
    }
    if (!withSymbol) return num;
    const sym = opts?.currency_symbol || '৳';
    const thin = ' ';                                   // thin space, matches &thinsp;
    return opts?.currency_position === 'after' ? `${num}${thin}${sym}` : `${sym}${thin}${num}`;
  }
}
