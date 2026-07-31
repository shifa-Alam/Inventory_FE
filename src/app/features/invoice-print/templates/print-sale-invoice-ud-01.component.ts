import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { TenantInvoiceSettings } from '../../../core/services/tenant-settings.service';
import { InvMoneyPipe } from '../../../shared/pipes/inv-money.pipe';
import { InvoiceCodeComponent } from '../../../shared/components/invoice-code.component';
import { invoiceSavings } from './invoice-savings';
import { amountInWords } from './amount-in-words';

/**
 * Bespoke sale-invoice template for tenant code "ud_01".
 * Registered in tenant-templates.ts; see that file for the resolution order.
 *
 * Built to read as a Bangladeshi commercial invoice rather than a generic
 * receipt, which means three things the other templates do not do:
 *
 *   1. BIN / VAT registration and trade licence in the header. On a commercial
 *      invoice here these are the fields a buyer's accounts department looks for
 *      first; both come from tenant settings and the row hides when unset.
 *   2. The total written out in words (see amount-in-words.ts). This is what
 *      makes the figure hard to alter after issue, and its absence is the usual
 *      reason an invoice gets sent back.
 *   3. Two signature blocks plus a seal area — customer and authorised — because
 *      a delivery-cum-invoice document is signed by both parties.
 *
 * Everything else is driven by the tenant's invoice_options so one template
 * serves a wholesaler and a retailer without a fork.
 */
@Component({
  selector: 'app-print-sale-invoice-ud-01',
  standalone: true,
  imports: [CommonModule, TranslatePipe, InvMoneyPipe, InvoiceCodeComponent],
  templateUrl: './print-sale-invoice-ud-01.component.html',
  styleUrls: ['./print-sale-invoice-ud-01.component.css']
})
export class PrintSaleInvoiceUd01Component {
  @Input() invoice: any;
  @Input() settings!: TenantInvoiceSettings;

  /** Line total before any invoice-level discount. */
  get subtotal(): number {
    return (this.invoice?.items ?? []).reduce(
      (sum: number, i: any) => sum + (Number(i.quantity) || 0) * (Number(i.rate) || 0), 0);
  }

  get savings(): number { return invoiceSavings(this.invoice); }

  /** Distinct lines, not summed quantity: on a wholesale invoice the buyer
   *  checks the carton count against the number of rows. */
  get lineCount(): number { return (this.invoice?.items ?? []).length; }

  get totalQty(): number {
    return (this.invoice?.items ?? []).reduce((sum: number, i: any) => sum + (Number(i.quantity) || 0), 0);
  }

  /** Payable is what the words line must state — not the subtotal, or the
   *  written amount would contradict the figure the customer pays. */
  get payable(): number {
    return Math.max(0, (Number(this.invoice?.total_amount) || 0));
  }

  get payableInWords(): string { return amountInWords(this.payable); }

  get isPaid(): boolean { return (this.invoice?.due_amount ?? 1) <= 0; }
}
