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
  trendDays = 7;             // sales-trend window: 7 / 30 / 90

  constructor(private api: ApiService, public router: Router) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.api.get(`/dashboard/?trend_days=${this.trendDays}`).subscribe({
      next: (res: any) => { this.data = res; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  setTrend(days: number) {
    if (this.trendDays === days) return;
    this.trendDays = days;
    this.load();
  }

  go(path: string) { this.router.navigate([path]); }

  /** Smart-insight severity → CSS class for the coloured dot/border. */
  insightClass(type: string): string {
    return {
      positive: 'ins-positive', warning: 'ins-warning',
      danger: 'ins-danger', info: 'ins-info',
    }[type] ?? 'ins-info';
  }

  categoryBarWidth(rev: number): number {
    const rows: any[] = this.data.sales_by_category ?? [];
    const max = Math.max(...rows.map(r => r.revenue), 1);
    return Math.max(2, Math.round((rev / max) * 100));
  }

  customerBarWidth(total: number): number {
    const rows: any[] = this.data.top_customers ?? [];
    const max = Math.max(...rows.map(r => r.total), 1);
    return Math.max(2, Math.round((total / max) * 100));
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
    return Math.round(n).toLocaleString('en-US');
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

  get profitPositive(): boolean      { return (this.data.profit ?? 0) >= 0; }
  get grossProfitPositive(): boolean { return (this.data.gross_profit ?? 0) >= 0; }
  get netProfitPositive(): boolean   { return (this.data.net_profit ?? 0) >= 0; }

  expenseCatLabel(cat: string): string {
    return cat;
  }

  expenseCatClass(cat: string): string {
    const palette = ['ec-purple', 'ec-blue', 'ec-orange', 'ec-yellow', 'ec-green', 'ec-teal', 'ec-pink', 'ec-gray'];
    if (!cat) return 'ec-gray';
    let hash = 0;
    for (let i = 0; i < cat.length; i++) hash = (hash * 31 + cat.charCodeAt(i)) | 0;
    return palette[Math.abs(hash) % palette.length];
  }

  expenseCatEntries(): { key: string; label: string; amount: number; cls: string; pct: number }[] {
    const map: Record<string, number> = this.data.expense_by_category ?? {};
    const total = this.data.month_expenses || 1;
    return Object.entries(map)
      .map(([k, v]) => ({
        key: k, label: this.expenseCatLabel(k), amount: v as number,
        cls: this.expenseCatClass(k), pct: Math.round(((v as number) / total) * 100)
      }))
      .sort((a, b) => b.amount - a.amount);
  }
}
