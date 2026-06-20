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
  today = new Date();

  constructor(private api: ApiService, public router: Router) {}

  ngOnInit() {
    this.loading = true;
    this.api.get('/dashboard/').subscribe({
      next: (res: any) => { this.data = res; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  get chartBars(): { label: string; amount: number; collection: number; count: number; height: number; collectHeight: number; isToday: boolean }[] {
    const rows: any[] = this.data.sales_chart ?? [];
    if (!rows.length) return [];
    const max = Math.max(...rows.map(r => Math.max(r.amount, r.collection ?? 0)), 1);
    const todayStr = localDateStr();
    return rows.map(r => ({
      label:         r.label,
      amount:        r.amount,
      collection:    r.collection ?? 0,
      count:         r.count,
      height:        Math.max(r.amount > 0 ? 4 : 0, Math.round((r.amount / max) * 100)),
      collectHeight: Math.max(r.collection > 0 ? 4 : 0, Math.round(((r.collection ?? 0) / max) * 100)),
      isToday:       r.date === todayStr
    }));
  }

  fmt(n: number): string {
    if (n >= 100000) return (n / 100000).toFixed(1) + 'L';
    if (n >= 1000)   return (n / 1000).toFixed(1) + 'K';
    return Math.round(n).toString();
  }

  topBarWidth(rev: number): number {
    const rows: any[] = this.data.top_products ?? [];
    const max = Math.max(...rows.map((r: any) => r.revenue), 1);
    return Math.round((rev / max) * 100);
  }

  stockBarWidth(stock: number): number {
    const max = Math.max(...(this.data.low_stock_items ?? []).map((i: any) => i.max_stock ?? 50), 50);
    return Math.max(2, Math.round((stock / max) * 100));
  }

  get profitPositive(): boolean { return (this.data.profit ?? 0) >= 0; }
}
