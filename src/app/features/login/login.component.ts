import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
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

  constructor(private auth: AuthService, private router: Router, public lang: LanguageService) { }

  login() {
    if (!this.username.trim() || !this.password.trim()) {
      this.errorMsg = 'Please enter username and password.';
      return;
    }
    this.loading = true;
    this.errorMsg = '';
    this.auth.login({ username: this.username, password: this.password }).subscribe({
      next: (res: any) => {
        this.auth.setToken(res.access_token);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.detail || 'Invalid username or password.';
      }
    });
  }
}
