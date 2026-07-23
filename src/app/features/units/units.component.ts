import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-units',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './units.component.html',
  styleUrls: ['./units.component.css'],
})
export class UnitsComponent implements OnInit {
  units: any[] = [];
  loading = false;
  showForm = false;
  newUnit: any = { id: 0, name: '', symbol: '' };

  @HostListener('document:keydown.escape')
  onEscape() { if (this.showForm) this.cancelForm(); }

  constructor(private api: ApiService, private confirmSvc: ConfirmService, private toast: ToastService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.get('/units/?is_active=true').subscribe({
      next: (res: any) => { this.units = res.data ?? res; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  openAdd() { this.newUnit = { id: 0, name: '', symbol: '' }; this.showForm = true; }
  cancelForm() { this.newUnit = { id: 0, name: '', symbol: '' }; this.showForm = false; }
  edit(u: any) { this.newUnit = { ...u }; this.showForm = true; }

  save() {
    if (!this.newUnit.name?.trim()) { this.toast.error('Unit name is required'); return; }
    const payload = { name: this.newUnit.name.trim(), symbol: this.newUnit.symbol?.trim() || null };
    const req = this.newUnit.id > 0
      ? this.api.put(`/units/${this.newUnit.id}`, payload)
      : this.api.post('/units/', payload);
    req.subscribe({
      next: () => { this.toast.success(this.newUnit.id ? 'Unit updated' : 'Unit added'); this.load(); this.cancelForm(); },
      error: () => {},   // global interceptor toasts the backend message
    });
  }

  async delete(u: any) {
    if (!await this.confirmSvc.open(`Deactivate unit "${u.name}"? Products keep their history.`, { confirmLabel: 'Deactivate', danger: true })) return;
    this.api.delete(`/units/${u.id}`).subscribe({ next: () => this.load(), error: () => {} });
  }
}
