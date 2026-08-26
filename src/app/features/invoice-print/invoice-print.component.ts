import { Component, OnInit, OnDestroy, ElementRef, ViewChild, Type, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, Location, NgComponentOutlet } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import html2pdf from 'html2pdf.js';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { TenantSettingsService, TenantInvoiceSettings, DEFAULT_INVOICE_SETTINGS } from '../../core/services/tenant-settings.service';
import { PrintLanguageService } from '../../core/services/print-language.service';
import { InvoiceClassicComponent } from './templates/invoice-classic.component';
import { InvoiceCompactComponent } from './templates/invoice-compact.component';
import { InvoiceThermalComponent } from './templates/invoice-thermal.component';
import { TENANT_TEMPLATES } from './templates/tenant-templates';

@Component({
  selector: 'app-invoice-print',
  standalone: true,
  imports: [CommonModule, NgComponentOutlet, TranslatePipe, InvoiceClassicComponent, InvoiceCompactComponent, InvoiceThermalComponent],
  templateUrl: './invoice-print.component.html',
  styleUrls: ['./invoice-print.component.css']
})
export class InvoicePrintComponent implements OnInit, OnDestroy {

  invoice: any = null;
  settings: TenantInvoiceSettings | null = null;
  loading = true;
  /** Bespoke per-tenant template from TENANT_TEMPLATES; null = generic templates. */
  customTemplate: Type<unknown> | null = null;
  @ViewChild('invoiceBox', { static: false }) invoiceBox!: ElementRef;

  private autoPrint = false;
  private autoPrinted = false;
  private destroyRef = inject(DestroyRef);
  /** App UI language before this print view overrode it; restored on leave.
   *  Captured synchronously in the constructor — never from the async
   *  settings response — so a slow request or an early navigation-away can
   *  never leave this null and skip the restore (see ngOnDestroy). */
  private readonly prevLang: string;

  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private api: ApiService,
    private tenantSettings: TenantSettingsService,
    private printLang: PrintLanguageService,
    translate: TranslateService
  ) {
    this.prevLang = translate.currentLang() ?? 'en';
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.autoPrint = this.route.snapshot.queryParamMap.get('print') === '1';

    // takeUntilDestroyed: without it, a settings response that arrives after
    // the user has already navigated away would still switch the app's global
    // language on a component that's gone — ngOnDestroy already ran, so
    // nothing would ever restore it, leaving the whole app stuck in the
    // document's print language.
    this.tenantSettings.getSettings().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (s) => {
        this.settings = s;
        // Resolve a bespoke template from the tenant's code (e.g. 'at_01').
        this.customTemplate = (s.code && TENANT_TEMPLATES[s.code]) || null;
        this.applyDocLanguage(s);
        this.maybeAutoPrint();
      },
      error: () => { this.settings = DEFAULT_INVOICE_SETTINGS; this.applyDocLanguage(DEFAULT_INVOICE_SETTINGS); this.maybeAutoPrint(); }
    });

    if (id) {
      this.api.get(`/sales/${id}`).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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

  /** Print documents in the tenant's configured language (en/bn/bilingual),
   *  independent of the app UI language; the UI language is restored on leave. */
  private applyDocLanguage(s: TenantInvoiceSettings) {
    this.printLang.applyForView(s.options.print_language);
  }

  ngOnDestroy() {
    this.printLang.restore(this.prevLang);
  }

  /** Auto-print only once, after BOTH the invoice and tenant settings are ready. */
  private maybeAutoPrint() {
    if (!this.autoPrint || this.autoPrinted || !this.invoice || !this.settings) return;
    this.autoPrinted = true;
    // Strip ?print=1 from the address bar right away — otherwise a plain page
    // reload (or hitting back/forward) re-runs this exact flow and pops the
    // print dialog again, long after the sale it belonged to is done.
    this.location.replaceState(window.location.pathname);
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
