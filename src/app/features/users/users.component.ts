import { Component, HostListener, OnInit } from '@angular/core';
import { AutofocusDirective } from '../../shared/directives/autofocus.directive';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { TranslatePipe } from '@ngx-translate/core';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { ConfirmService } from '../../shared/services/confirm.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, PaginatorComponent, AutofocusDirective],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {
  users: any[] = [];
  loading = false;

  page = 1;
  pages = 1;
  total = 0;
  pageSize = 20;

  showForm = false;

  /** Esc closes the open form modal — standard desktop expectation. */
  @HostListener('document:keydown.escape')
  onEscape() { if (this.showForm) this.cancelForm(); }
  editingId: number | null = null;
  username = '';
  password = '';
  confirmPassword = '';
  role = 'cashier';
  successMsg = '';
  errorMsg = '';

  tenants: any[] = [];
  selectedTenantId: number | null = null;

  constructor(private api: ApiService, public authSvc: AuthService, private confirmSvc: ConfirmService) {}

  get isSystemAdmin(): boolean { return this.authSvc.isSystemAdmin(); }

  ngOnInit() {
    this.load();
    if (this.isSystemAdmin) {
      this.api.get('/tenants/').subscribe({ next: (res: any) => this.tenants = res?.data ?? res, error: () => {} });
    }
  }

  load() {
    this.loading = true;
    this.api.get(`/auth/users/?page=${this.page}&page_size=${this.pageSize}`).subscribe({
      next: (res: any) => {
        this.users = res.data;
        this.total = res.total;
        this.pages = res.pages;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onPageChange(p: number) { this.page = p; this.load(); }

  get isEditing(): boolean { return this.editingId !== null; }

  /** Roles selectable in the dropdown. The assignable set depends on who is
   *  logged in, but when editing we also inject the user's current role if it
   *  isn't in that set — otherwise the <select> has no matching option and
   *  renders blank (e.g. a system-admin editing a cashier). */
  roleOptions(): { value: string; labelKey: string }[] {
    const opts = this.isSystemAdmin
      ? [{ value: 'system_admin', labelKey: 'users.role_system_admin' },
         { value: 'admin', labelKey: 'users.role_admin' }]
      : [{ value: 'manager', labelKey: 'users.role_manager' },
         { value: 'cashier', labelKey: 'users.role_cashier' }];
    if (this.isEditing && this.role && !opts.some(o => o.value === this.role)) {
      opts.unshift({ value: this.role, labelKey: 'users.role_' + this.role });
    }
    return opts;
  }

  get isValid(): boolean {
    if (this.username.trim().length < 3) return false;
    if (!this.isEditing) {
      return this.password.length >= 8 && this.password === this.confirmPassword;
    }
    // On edit: password is optional — if provided must be valid
    if (this.password.length > 0) {
      return this.password.length >= 8 && this.password === this.confirmPassword;
    }
    return true;
  }

  get passwordMismatch(): boolean {
    return this.confirmPassword.length > 0 && this.password !== this.confirmPassword;
  }

  openAdd() { this.reset(); this.showForm = true; }
  cancelForm() { this.reset(); this.showForm = false; }

  edit(u: any) {
    this.editingId = u.id;
    this.username = u.username;
    this.password = '';
    this.confirmPassword = '';
    this.role = u.role;
    // Show the user's current tenant in the (edit-locked) selector — the
    // backend ignores tenant_id on update, so it can't be reassigned here.
    this.selectedTenantId = u.tenant_id ?? null;
    this.successMsg = '';
    this.errorMsg = '';
    this.showForm = true;
  }

  save() {
    this.successMsg = '';
    this.errorMsg = '';
    if (!this.isValid) return;

    this.loading = true;
    const payload: any = { username: this.username.trim(), role: this.role, password: this.password };
    if (this.isSystemAdmin && this.selectedTenantId) payload['tenant_id'] = this.selectedTenantId;

    const req = this.isEditing
      ? this.api.put(`/auth/users/${this.editingId}`, payload)
      : this.api.post('/auth/register', payload);

    req.subscribe({
      next: () => {
        this.loading = false;
        this.successMsg = this.isEditing
          ? `User "${this.username.trim()}" updated successfully.`
          : `User "${this.username.trim()}" created successfully.`;
        this.reset();
        this.load();
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.detail ?? (this.isEditing ? 'Failed to update user.' : 'Failed to create user. Username may already exist.');
      }
    });
  }

  async delete(id: number) {
    if (!await this.confirmSvc.open('Deactivate this user? They will no longer be able to log in.')) return;
    this.api.delete(`/auth/users/${id}`).subscribe({
      next: () => this.load(),
      error: () => {}
    });
  }

  cancel() { this.cancelForm(); }

  private reset() {
    this.editingId = null;
    this.username = '';
    this.password = '';
    this.confirmPassword = '';
    this.role = 'cashier';
    this.selectedTenantId = null;
    this.successMsg = '';
    this.errorMsg = '';
    this.showForm = false;
  }
}
