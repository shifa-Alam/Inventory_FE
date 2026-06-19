import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { localDateStr } from '../../shared/utils/date.utils';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {

  data: any = {};
  loading = false;

  constructor(private api: ApiService, public router: Router) {}

  ngOnInit() {
    this.loading = true;
    this.api.get('/dashboard').subscribe({
      next: (res: any) => { this.data = res; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  /* ── Chart helpers ─────────────────────────────────────────── */

  get chartBars(): { label: string; amount: number; count: number; height: number; isToday: boolean }[] {
    const rows: any[] = this.data.sales_chart ?? [];
    if (!rows.length) return [];
    const max = Math.max(...rows.map(r => r.amount), 1);
    const todayStr = localDateStr();
    return rows.map(r => ({
      label:   r.label,
      amount:  r.amount,
      count:   r.count,
      height:  Math.max(4, Math.round((r.amount / max) * 100)),
      isToday: r.date === todayStr
    }));
  }

  get chartMaxLabel(): string {
    const rows: any[] = this.data.sales_chart ?? [];
    const max = Math.max(...rows.map(r => r.amount), 0);
    return '৳' + this.fmt(max);
  }

  fmt(n: number): string {
    if (n >= 100000) return (n / 100000).toFixed(1) + 'L';
    if (n >= 1000)   return (n / 1000).toFixed(1) + 'K';
    return Math.round(n).toString();
  }

  /* top products bar width */
  topBarWidth(rev: number): number {
    const rows: any[] = this.data.top_products ?? [];
    const max = Math.max(...rows.map((r: any) => r.revenue), 1);
    return Math.round((rev / max) * 100);
  }

  get profitPositive(): boolean { return (this.data.profit ?? 0) >= 0; }
}
