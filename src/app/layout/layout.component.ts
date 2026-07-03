import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../core/services/language.service';
import { AuthService } from '../core/services/auth.service';
import { ToastComponent } from '../shared/components/toast/toast.component';
import { ConfirmModalComponent } from '../shared/components/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe, ToastComponent, ConfirmModalComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent {
  sidebarOpen = false;
  isDark = false;
  currentUser: { username: string; role: string; tenant_id: number | null } | null = null;

  constructor(
    public lang: LanguageService,
    public auth: AuthService,
    private router: Router
  ) {
    this.currentUser = this.auth.getCurrentUser();
    this.isDark = localStorage.getItem('theme') === 'dark';
    this.applyTheme();
  }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
  closeSidebar()  { this.sidebarOpen = false; }

  toggleTheme() {
    this.isDark = !this.isDark;
    localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
    this.applyTheme();
  }

  private applyTheme() {
    document.body.classList.toggle('dark', this.isDark);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
