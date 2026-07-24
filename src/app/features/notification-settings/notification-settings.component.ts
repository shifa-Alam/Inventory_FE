import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-notification-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notification-settings.component.html',
  styleUrls: ['./notification-settings.component.css'],
})
export class NotificationSettingsComponent implements OnInit {
  settings = { sms_enabled: true, sender_name: '', language: 'bn', sms_credit_balance: 0 };
  log: any[] = [];
  loading = false;
  saving = false;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() { this.load(); this.loadLog(); }

  load() {
    this.loading = true;
    this.api.get('/notifications/settings').subscribe({
      next: (res: any) => { this.settings = res; this.loading = false; },
      error: () => { this.loading = false; },
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
