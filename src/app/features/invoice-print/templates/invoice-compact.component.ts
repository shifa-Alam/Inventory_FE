import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { TenantInvoiceSettings } from '../../../core/services/tenant-settings.service';

@Component({
  selector: 'app-invoice-compact',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './invoice-compact.component.html',
  styleUrls: ['./invoice-compact.component.css']
})
export class InvoiceCompactComponent {
  @Input() invoice: any;
  @Input() settings!: TenantInvoiceSettings;
}
