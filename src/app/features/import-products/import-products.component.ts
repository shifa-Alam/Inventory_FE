import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
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
export class ImportProductsComponent implements OnDestroy {
  /** Import and Export are two unrelated jobs someone comes here to do —
   *  tabs keep each one's full attention on screen instead of making every
   *  visit scroll past whichever task isn't wanted right now. */
  activeTab: 'import' | 'export' = 'import';

  file: File | null = null;
  importing = false;
  report: any = null;

  /** 'uploading' while the file is still in transit (real byte progress);
   *  'processing' once it's fully sent and the server is parsing/writing
   *  rows — no server-side progress signal exists for that phase, so we
   *  just show an indeterminate bar plus how long it's been running. */
  phase: 'uploading' | 'processing' | null = null;
  uploadPercent = 0;
  uploadedBytes = 0;
  totalBytes = 0;
  elapsedMs = 0;
  private elapsedTimer: ReturnType<typeof setInterval> | null = null;
  private startedAt = 0;

  private readonly TEMPLATE_HEADERS = [
    'name', 'barcode', 'category', 'cost', 'sale_price', 'mrp', 'minimum_stock', 'opening_stock',
  ];
  private readonly TEMPLATE_EXAMPLE = ['Egg', '8901234', 'Grocery', '8', '10', '12', '24', '100'];

  /** null when idle; the format currently downloading otherwise — drives
   *  which of the two export buttons shows its own spinner. */
  exportingFormat: 'xlsx' | 'pdf' | null = null;

  constructor(private api: ApiService, private toast: ToastService, private translate: TranslateService) {}

  /** Downloads every active product either as an .xlsx workbook (one sheet
   *  per category, in the same shape /products/import expects — so it can
   *  be edited and fed straight back in) or as a printable PDF price list
   *  with the shop's own letterhead. */
  exportProducts(format: 'xlsx' | 'pdf') {
    this.exportingFormat = format;
    const filename = format === 'pdf' ? 'products_price_list.pdf' : 'products_export.xlsx';
    this.api.getBlob(`/products/export?format=${format}`).subscribe({
      next: (blob: Blob) => {
        this.exportingFormat = null;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.exportingFormat = null;
        this.toast.error(this.translate.instant('products.export_failed'));
      },
    });
  }

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
    this.phase = 'uploading';
    this.uploadPercent = 0;
    this.uploadedBytes = 0;
    this.totalBytes = this.file.size;
    this.startedAt = Date.now();
    this.elapsedMs = 0;
    this.elapsedTimer = setInterval(() => { this.elapsedMs = Date.now() - this.startedAt; }, 100);

    this.api.postWithProgress('/products/import', form).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress) {
          this.uploadedBytes = event.loaded;
          this.totalBytes = event.total || this.totalBytes;
          this.uploadPercent = event.total ? Math.round((100 * event.loaded) / event.total) : 0;
          if (this.uploadPercent >= 100) this.phase = 'processing';
        } else if (event.type === HttpEventType.Response) {
          this.stopProgress();
          const res: any = event.body;
          this.report = res;
          const parts: string[] = [];
          if (res.created > 0) parts.push(this.translate.instant('import_products.imported_count', { n: res.created }));
          if (res.updated > 0) parts.push(this.translate.instant('import_products.updated_count', { n: res.updated }));
          if (parts.length) this.toast.success(parts.join(' · '));
          if (res.created === 0 && res.updated === 0 && res.total > 0) {
            this.toast.warning(this.translate.instant('import_products.no_new'));
          }
        }
      },
      error: (err: any) => {
        this.stopProgress();
        this.toast.error(err?.error?.detail || this.translate.instant('import_products.import_failed'));
      },
    });
  }

  private stopProgress() {
    this.importing = false;
    this.phase = null;
    if (this.elapsedTimer) { clearInterval(this.elapsedTimer); this.elapsedTimer = null; }
  }

  reset() { this.file = null; this.report = null; }

  ngOnDestroy() { if (this.elapsedTimer) clearInterval(this.elapsedTimer); }

  /** Only the rows worth the operator's attention (skipped / errored) —
   *  "created" and "updated" are both successful outcomes, not problems. */
  get problemRows(): any[] {
    return (this.report?.results || []).filter((r: any) => r.status !== 'created' && r.status !== 'updated');
  }

  /** True once any row carries a sheet name — a multi-sheet XLSX (one tab per
   *  category) is worth a "Sheet" column; a plain CSV has none to show. */
  get hasSheetInfo(): boolean {
    return (this.report?.results || []).some((r: any) => !!r.sheet);
  }

  get elapsedSeconds(): string {
    return (this.elapsedMs / 1000).toFixed(1);
  }

  /** e.g. 842 -> "842 B", 15400 -> "15.0 KB", 3_200_000 -> "3.1 MB" */
  formatBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }
}
