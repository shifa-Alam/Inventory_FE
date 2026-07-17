import { Component, HostListener, OnInit } from '@angular/core';
import { AutofocusDirective } from '../../shared/directives/autofocus.directive';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { ToastService } from '../../shared/services/toast.service';

interface InvoiceOptions {
  show_mrp: boolean;
  show_signature: boolean;
  show_status: boolean;
  show_paid_due: boolean;
  show_footer_contact: boolean;
}

const B2B_OPTIONS: InvoiceOptions = { show_mrp: true,  show_signature: true,  show_status: true,  show_paid_due: true,  show_footer_contact: true };
const B2C_OPTIONS: InvoiceOptions = { show_mrp: false, show_signature: false, show_status: false, show_paid_due: false, show_footer_contact: true };

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [CommonModule, FormsModule, AutofocusDirective],
  templateUrl: './tenants.component.html',
  styleUrls: ['./tenants.component.css']
})
export class TenantsComponent implements OnInit {
  tenants: any[] = [];
  loading = false;
  showForm = false;

  /** Esc closes the open form modal — standard desktop expectation. */
  @HostListener('document:keydown.escape')
  onEscape() { if (this.showForm) this.cancelForm(); }
  editingId: number | null = null;
  successMsg = '';
  errorMsg = '';

  /* form model */
  name = '';
  code = '';
  businessType: 'B2B' | 'B2C' = 'B2C';
  phone = '';
  email = '';
  address = '';
  logo = '';
  tagline = '';
  invoiceTemplate = '';          // '' = Auto (derived from business type)
  accentColor = '#0f172a';
  footerNote = '';
  customizeOptions = false;      // false = Auto options by business type
  options: InvoiceOptions = { ...B2C_OPTIONS };

  constructor(private api: ApiService, private confirmSvc: ConfirmService, private toast: ToastService) {}

  ngOnInit() { this.load(); }

  get isEditing(): boolean { return this.editingId !== null; }

  /** Template the tenant will effectively print with when set to Auto. */
  get derivedTemplate(): string { return this.businessType === 'B2B' ? 'classic' : 'thermal'; }

  load() {
    this.loading = true;
    this.api.get('/tenants/').subscribe({
      next: (res: any) => { this.tenants = res?.data ?? res; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  openAdd() { this.reset(); this.showForm = true; }
  cancelForm() { this.reset(); this.showForm = false; }

  onBusinessTypeChange() {
    // Keep the option toggles in sync with the profile until customized.
    if (!this.customizeOptions) {
      this.options = { ...(this.businessType === 'B2B' ? B2B_OPTIONS : B2C_OPTIONS) };
    }
  }

  edit(t: any) {
    this.reset();
    this.editingId = t.id;
    this.name = t.name;
    this.code = t.code ?? '';
    this.businessType = t.business_type === 'B2B' ? 'B2B' : 'B2C';
    this.phone = t.phone ?? '';
    this.email = t.email ?? '';
    this.address = t.address ?? '';
    this.logo = t.logo ?? '';
    this.tagline = t.tagline ?? '';
    this.invoiceTemplate = t.invoice_template ?? '';
    this.accentColor = t.accent_color ?? '#0f172a';
    this.footerNote = t.footer_note ?? '';
    this.customizeOptions = !!t.invoice_options;
    this.options = t.invoice_options
      ? { ...B2C_OPTIONS, ...t.invoice_options }
      : { ...(this.businessType === 'B2B' ? B2B_OPTIONS : B2C_OPTIONS) };
    this.showForm = true;
  }

  save() {
    this.successMsg = '';
    this.errorMsg = '';
    if (!this.name.trim()) return;
    this.loading = true;

    const payload: any = {
      name: this.name.trim(),
      code: this.code.trim().toLowerCase() || null,
      business_type: this.businessType,
      phone: this.phone.trim() || null,
      email: this.email.trim() || null,
      address: this.address.trim() || null,
      logo: this.logo.trim() || null,
      tagline: this.tagline.trim() || null,
      invoice_template: this.invoiceTemplate || null,   // null = Auto
      accent_color: this.accentColor || null,
      footer_note: this.footerNote.trim() || null,
      invoice_options: this.customizeOptions ? this.options : null,  // null = Auto
    };

    const req = this.isEditing
      ? this.api.patch(`/tenants/${this.editingId}`, payload)
      : this.api.post('/tenants/', payload);

    req.subscribe({
      next: () => {
        this.successMsg = `Tenant "${payload.name}" ${this.isEditing ? 'updated' : 'created'}.`;
        this.showForm = false;
        this.editingId = null;
        this.load();
        setTimeout(() => this.successMsg = '', 5000);
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMsg = err?.error?.detail ?? 'Failed to save tenant.';
      }
    });
  }

  async deactivate(t: any) {
    if (!await this.confirmSvc.open(`Deactivate tenant "${t.name}"?`, { confirmLabel: 'Deactivate' })) return;
    this.api.delete(`/tenants/${t.id}/deactivate`).subscribe({
      next: () => this.load(),
      error: (err: any) => this.toast.error(err?.error?.detail ?? 'Failed to deactivate.')
    });
  }

  private reset() {
    this.editingId = null;
    this.name = '';
    this.code = '';
    this.businessType = 'B2C';
    this.phone = '';
    this.email = '';
    this.address = '';
    this.logo = '';
    this.tagline = '';
    this.invoiceTemplate = '';
    this.accentColor = '#0f172a';
    this.footerNote = '';
    this.customizeOptions = false;
    this.options = { ...B2C_OPTIONS };
    this.successMsg = '';
    this.errorMsg = '';
  }
}
