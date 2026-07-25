import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../shared/services/toast.service';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-import-products',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './import-products.component.html',
  styleUrls: ['./import-products.component.css'],
})
export class ImportProductsComponent {
  file: File | null = null;
  importing = false;
  report: any = null;

  private readonly TEMPLATE_HEADERS = [
    'name', 'barcode', 'category', 'cost', 'sale_price', 'mrp', 'minimum_stock', 'opening_stock',
  ];
  private readonly TEMPLATE_EXAMPLE = ['Egg', '8901234', 'Grocery', '8', '10', '12', '24', '100'];

  constructor(private api: ApiService, private toast: ToastService, private translate: TranslateService) {}

  onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    this.file = input.files && input.files.length ? input.files[0] : null;
    this.report = null;
  }

  /** Generate the CSV template on the client so no round-trip / auth is needed. */
  downloadTemplate() {
    const csv = [this.TEMPLATE_HEADERS.join(','), this.TEMPLATE_EXAMPLE.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  import() {
    if (!this.file) { this.toast.warning(this.translate.instant('import_products.choose_file_first')); return; }
    const form = new FormData();
    form.append('file', this.file);
    this.importing = true;
    this.report = null;
    this.api.post('/products/import', form).subscribe({
      next: (res: any) => {
        this.importing = false;
        this.report = res;
        if (res.created > 0) this.toast.success(this.translate.instant('import_products.imported_count', { n: res.created }));
        if (res.created === 0 && res.total > 0) this.toast.warning(this.translate.instant('import_products.no_new'));
      },
      error: (err: any) => {
        this.importing = false;
        this.toast.error(err?.error?.detail || this.translate.instant('import_products.import_failed'));
      },
    });
  }

  reset() { this.file = null; this.report = null; }

  /** Only the rows worth the operator's attention (skipped / errored). */
  get problemRows(): any[] {
    return (this.report?.results || []).filter((r: any) => r.status !== 'created');
  }
}
