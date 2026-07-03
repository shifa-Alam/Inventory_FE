import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tenants.component.html',
  styleUrls: ['./tenants.component.css']
})
export class TenantsComponent implements OnInit {
  tenants: any[] = [];
  loading = false;
  showForm = false;
  name = '';
  successMsg = '';
  errorMsg = '';

  constructor(private api: ApiService, private confirmSvc: ConfirmService, private toast: ToastService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.get('/tenants/').subscribe({
      next: (res: any) => { this.tenants = res; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  openAdd() { this.name = ''; this.successMsg = ''; this.errorMsg = ''; this.showForm = true; }
  cancelForm() { this.name = ''; this.successMsg = ''; this.errorMsg = ''; this.showForm = false; }

  create() {
    this.successMsg = '';
    this.errorMsg = '';
    if (!this.name.trim()) return;
    this.loading = true;
    this.api.post('/tenants/', { name: this.name.trim() }).subscribe({
      next: () => {
        this.successMsg = `Tenant "${this.name.trim()}" created.`;
        this.name = '';
        this.showForm = false;
        this.load();
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMsg = err?.error?.detail ?? 'Failed to create tenant.';
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
}
