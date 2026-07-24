import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../shared/services/toast.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-notification-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notification-settings.component.html',
  styleUrls: ['./notification-settings.component.css'],
})
export class NotificationSettingsComponent implements OnInit {
  settings = { sms_enabled: true, sender_name: '', language: 'bn' };
  credits = 0;
  log: any[] = [];
  saving = false;
  isAdmin = false;

  constructor(private api: ApiService, private toast: ToastService, private auth: AuthService) {}

  ngOnInit() {
    // Credits + log are readable by managers too; the settings form is
    // owner/admin only (backend gates GET/PUT /settings on notification.manage).
    this.isAdmin = this.auth.isAdmin();
    this.loadCredits();
    this.loadLog();
    if (this.isAdmin) this.loadSettings();
  }

  loadCredits() {
    this.api.get('/notifications/credits').subscribe({
      next: (res: any) => this.credits = res.balance ?? 0,
      error: () => {},
    });
  }

  loadSettings() {
    this.api.get('/notifications/settings').subscribe({
      next: (res: any) => this.settings = res,
      error: () => {},
    });
  }

  loadLog() {
    this.api.get('/notifications/log?page_size=10').subscribe({
      next: (res: any) => this.log = res.data ?? [],
      error: () => {},
    });
  }

  save() {
    this.saving = true;
    this.api.put('/notifications/settings', {
      sms_enabled: this.settings.sms_enabled,
      sender_name: this.settings.sender_name || null,
      language: this.settings.language,
    }).subscribe({
      next: (res: any) => {
        this.settings = res;
        this.saving = false;
        this.toast.success('Notification settings saved');
      },
      error: (err: any) => {
        this.saving = false;
        this.toast.error(err?.error?.detail || 'Failed to save settings');
      },
    });
  }
}
