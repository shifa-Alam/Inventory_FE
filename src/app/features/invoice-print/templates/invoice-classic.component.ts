import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { TenantInvoiceSettings } from '../../../core/services/tenant-settings.service';

@Component({
  selector: 'app-invoice-classic',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './invoice-classic.component.html',
  styleUrls: ['./invoice-classic.component.css']
})
export class InvoiceClassicComponent {
  @Input() invoice: any;
  @Input() settings!: TenantInvoiceSettings;
}
