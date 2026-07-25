import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../core/services/language.service';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

  username = '';
  password = '';
  errorMsg = '';
  loading = false;
  showPassword = false;
  userFocused = false;
  passFocused = false;
  year = new Date().getFullYear();

  constructor(private auth: AuthService, private router: Router, public lang: LanguageService, private subs: SubscriptionService, private translate: TranslateService) { }

  login() {
    if (!this.username.trim() || !this.password.trim()) {
      this.errorMsg = this.translate.instant('login.error_enter_credentials');
      return;
    }
    this.loading = true;
    this.errorMsg = '';
    this.auth.login({ username: this.username, password: this.password }).subscribe({
      next: (res: any) => {
        // Backend sets httpOnly cookies — nothing to store client-side.
        // The login response carries the subscription warning/grace message
        // that must pop up after every login until renewal.
        this.subs.setFromLogin(res?.subscription ?? null);
        this.loading = false;
        // system_admin has no tenant modules; land it on Users.
        this.router.navigate([this.auth.isSystemAdmin() ? '/users' : '/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.detail || this.translate.instant('login.error_invalid_credentials');
      }
    });
  }
}
