import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { TenantInvoiceSettings } from '../../../core/services/tenant-settings.service';

@Component({
  selector: 'app-invoice-thermal',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './invoice-thermal.component.html',
  styleUrls: ['./invoice-thermal.component.css']
})
export class InvoiceThermalComponent {
  @Input() invoice: any;
  @Input() settings!: TenantInvoiceSettings;
}
