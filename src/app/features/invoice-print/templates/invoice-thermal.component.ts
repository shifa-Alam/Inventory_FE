import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { TenantInvoiceSettings } from '../../../core/services/tenant-settings.service';
import { InvMoneyPipe } from '../../../shared/pipes/inv-money.pipe';
import { InvoiceCodeComponent } from '../../../shared/components/invoice-code.component';
import { invoiceSavings } from './invoice-savings';

@Component({
  selector: 'app-invoice-thermal',
  standalone: true,
  imports: [CommonModule, TranslatePipe, InvMoneyPipe, InvoiceCodeComponent],
  templateUrl: './invoice-thermal.component.html',
  styleUrls: ['./invoice-thermal.component.css']
})
export class InvoiceThermalComponent {
  @Input() invoice: any;
  @Input() settings!: TenantInvoiceSettings;

  get savings(): number { return invoiceSavings(this.invoice); }
}
