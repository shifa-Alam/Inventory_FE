import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { TranslatePipe } from '@ngx-translate/core';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, PaginatorComponent],
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

  editingId: number | null = null;
  username = '';
  password = '';
  confirmPassword = '';
  role = 'staff';
  successMsg = '';
  errorMsg = '';

  tenants: any[] = [];
  selectedTenantId: number | null = null;

  constructor(private api: ApiService, public authSvc: AuthService) {}

  get isSystemAdmin(): boolean { return this.authSvc.isSystemAdmin(); }

  ngOnInit() {
    this.load();
    if (this.isSystemAdmin) {
      this.api.get('/tenants/').subscribe({ next: (res: any) => this.tenants = res, error: () => {} });
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
      error: (err) => { console.error('Failed to load users', err); this.loading = false; }
    });
  }

  onPageChange(p: number) { this.page = p; this.load(); }

  get isEditing(): boolean { return this.editingId !== null; }

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

  edit(u: any) {
    this.editingId = u.id;
    this.username = u.username;
    this.password = '';
    this.confirmPassword = '';
    this.role = u.role;
    this.successMsg = '';
    this.errorMsg = '';
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

  delete(id: number) {
    if (confirm('Delete this user?')) {
      this.api.delete(`/auth/users/${id}`).subscribe({
        next: () => this.load(),
        error: (err) => console.error('Failed to delete user', err)
      });
    }
  }

  cancel() { this.reset(); }

  private reset() {
    this.editingId = null;
    this.username = '';
    this.password = '';
    this.confirmPassword = '';
    this.role = 'staff';
    this.selectedTenantId = null;
    this.successMsg = '';
    this.errorMsg = '';
  }
}
