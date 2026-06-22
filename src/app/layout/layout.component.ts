import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../core/services/language.service';
import { AuthService } from '../core/services/auth.service';
import { ToastComponent } from '../shared/components/toast/toast.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe, ToastComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent {
  sidebarOpen = false;
  currentUser: { username: string; role: string; tenant_id: number | null } | null = null;

  constructor(
    public lang: LanguageService,
    public auth: AuthService,
    private router: Router
  ) {
    this.currentUser = this.auth.getCurrentUser();
  }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
  closeSidebar()  { this.sidebarOpen = false; }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
