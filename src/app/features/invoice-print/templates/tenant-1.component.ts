import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { TenantInvoiceSettings } from '../../../core/services/tenant-settings.service';

/**
 * Bespoke invoice for tenant 1 (Amira Traders).
 * Registered in tenant-templates.ts — overrides the generic templates.
 */
@Component({
  selector: 'app-invoice-tenant-1',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './tenant-1.component.html',
  styleUrls: ['./tenant-1.component.css']
})
export class InvoiceTenant1Component {
  @Input() invoice: any;
  @Input() settings!: TenantInvoiceSettings;

  get subtotal(): number {
    return (this.invoice?.items ?? []).reduce((s: number, i: any) => s + i.quantity * i.rate, 0);
  }
}
