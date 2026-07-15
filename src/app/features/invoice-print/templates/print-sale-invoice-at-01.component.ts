import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { TenantInvoiceSettings } from '../../../core/services/tenant-settings.service';

/**
 * Bespoke sale-invoice template for tenant code "at_01" (Amira Traders).
 * Registered in tenant-templates.ts under that code — resolved from the tenant's
 * `code` in its settings, and overrides the generic classic/compact/thermal.
 *
 * To add a bespoke invoice for another tenant, copy this file as
 * print-sale-invoice-<code>.component.* and register it in tenant-templates.ts.
 */
@Component({
  selector: 'app-print-sale-invoice-at-01',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './print-sale-invoice-at-01.component.html',
  styleUrls: ['./print-sale-invoice-at-01.component.css']
})
export class PrintSaleInvoiceAt01Component {
  @Input() invoice: any;
  @Input() settings!: TenantInvoiceSettings;

  get subtotal(): number {
    return (this.invoice?.items ?? []).reduce((s: number, i: any) => s + i.quantity * i.rate, 0);
  }
}
