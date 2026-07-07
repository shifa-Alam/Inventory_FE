import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import html2pdf from 'html2pdf.js';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { TenantSettingsService, TenantInvoiceSettings, DEFAULT_INVOICE_SETTINGS } from '../../core/services/tenant-settings.service';
import { InvoiceClassicComponent } from './templates/invoice-classic.component';
import { InvoiceCompactComponent } from './templates/invoice-compact.component';
import { InvoiceThermalComponent } from './templates/invoice-thermal.component';

@Component({
  selector: 'app-invoice-print',
  standalone: true,
  imports: [CommonModule, TranslatePipe, InvoiceClassicComponent, InvoiceCompactComponent, InvoiceThermalComponent],
  templateUrl: './invoice-print.component.html',
  styleUrls: ['./invoice-print.component.css']
})
export class InvoicePrintComponent implements OnInit {

  invoice: any = null;
  settings: TenantInvoiceSettings | null = null;
  loading = true;
  @ViewChild('invoiceBox', { static: false }) invoiceBox!: ElementRef;

  private autoPrint = false;
  private autoPrinted = false;

  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private api: ApiService,
    private tenantSettings: TenantSettingsService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.autoPrint = this.route.snapshot.queryParamMap.get('print') === '1';

    this.tenantSettings.getSettings().subscribe({
      next: (s) => { this.settings = s; this.maybeAutoPrint(); },
      error: () => { this.settings = DEFAULT_INVOICE_SETTINGS; this.maybeAutoPrint(); }
    });

    if (id) {
      this.api.get(`/sales/${id}`).subscribe({
        next: (res: any) => {
          this.invoice = res;
          this.loading = false;
          this.maybeAutoPrint();
        },
        error: () => { this.loading = false; }
      });
    } else {
      this.invoice = JSON.parse(localStorage.getItem('invoice') || '{}');
      this.loading = false;
      this.maybeAutoPrint();
    }
  }

  /** Auto-print only once, after BOTH the invoice and tenant settings are ready. */
  private maybeAutoPrint() {
    if (!this.autoPrint || this.autoPrinted || !this.invoice || !this.settings) return;
    this.autoPrinted = true;
    setTimeout(() => window.print(), 1200);
  }

  goBack() { this.location.back(); }

  print(): void {
    window.print();
  }

  downloadPDF() {
    const element = this.invoiceBox.nativeElement;
    const thermal = this.settings?.invoice_template === 'thermal';
    const options = {
      margin: thermal ? 2 : 0.5,
      filename: `invoice-${this.invoice.id}.pdf`,
      image: { type: <"jpeg">"jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: thermal
        ? { unit: 'mm', format: [80, 297] as [number, number], orientation: 'portrait' as const }
        : { unit: 'in', format: 'a4', orientation: 'portrait' as const }
    };
    html2pdf().from(element).set(options).save();
  }
}
