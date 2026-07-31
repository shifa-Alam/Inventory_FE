import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';

type Preset = 'this_month' | 'last_month' | 'today' | 'this_year' | 'custom';

/**
 * Profit & Loss statement for any date range.
 *
 * The figures come from /reports/profit-loss, which reuses the dashboard's
 * P&L arithmetic — so the month-to-date view here and the dashboard card
 * always agree. Nothing is recomputed on the client for that reason.
 */
@Component({
  selector: 'app-profit-loss',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './profit-loss.component.html',
  styleUrls: ['./profit-loss.component.css'],
})
export class ProfitLossComponent implements OnInit {
  loading = false;
  preset: Preset = 'this_month';
  dateFrom = '';
  dateTo = '';
  data: any = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.applyPreset('this_month'); }

  /** Local YYYY-MM-DD — toISOString() would shift the day in +06 Dhaka. */
  private iso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  applyPreset(p: Preset): void {
    this.preset = p;
    const now = new Date();
    if (p === 'today') {
      this.dateFrom = this.dateTo = this.iso(now);
    } else if (p === 'this_month') {
      this.dateFrom = this.iso(new Date(now.getFullYear(), now.getMonth(), 1));
      this.dateTo = this.iso(now);
    } else if (p === 'last_month') {
      // Day 0 of this month = last day of the previous one.
      this.dateFrom = this.iso(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      this.dateTo = this.iso(new Date(now.getFullYear(), now.getMonth(), 0));
    } else if (p === 'this_year') {
      this.dateFrom = this.iso(new Date(now.getFullYear(), 0, 1));
      this.dateTo = this.iso(now);
    }
    if (p !== 'custom') this.load();
  }

  /** Custom range: only fetch once both ends are set and in order. */
  onCustomChange(): void {
    this.preset = 'custom';
    if (this.dateFrom && this.dateTo && this.dateFrom <= this.dateTo) this.load();
  }

  load(): void {
    this.loading = true;
    const params = { date_from: this.dateFrom, date_to: this.dateTo, compare: 'true' };
    this.api.get('/reports/profit-loss', params).subscribe({
      next: (res: any) => { this.data = res; this.loading = false; },
      error: () => { this.loading = false; },   // interceptor surfaces the message
    });
  }

  /** Expense categories, biggest first — the small ones are noise at the top.
   *  `share` drives the proportion bar, so a glance ranks them without reading. */
  get expenseRows(): Array<{ name: string; amount: number; share: number }> {
    const map = this.data?.expense_by_category ?? {};
    const rows = Object.keys(map)
      .map(name => ({ name, amount: Number(map[name]) || 0, share: 0 }))
      .sort((a, b) => b.amount - a.amount);
    const top = rows.length ? rows[0].amount : 0;
    for (const r of rows) r.share = top > 0 ? Math.max(2, Math.round(r.amount / top * 100)) : 0;
    return rows;
  }

  /** Nothing happened in this window — worth saying so explicitly rather than
   *  rendering a statement of zeros that looks like a loading failure. */
  get isEmpty(): boolean {
    return !!this.data && !this.data.sales && !this.data.expenses && !this.data.stock_loss;
  }

  get isLoss(): boolean { return (this.data?.net_profit ?? 0) < 0; }

  /**
   * Where each taka of net revenue went, as one stacked bar.
   *
   * Shares are of net revenue so the segments read as margin structure. When
   * costs exceed revenue there is no profit slice to draw — the bar fills with
   * cost and the loss is called out separately, rather than rendering a
   * negative-width segment.
   */
  get composition(): Array<{ key: string; value: number; pct: number }> {
    const d = this.data;
    if (!d) return [];
    const base = Number(d.net_revenue) || 0;
    if (base <= 0) return [];
    const parts = [
      { key: 'cogs', value: Number(d.net_cogs) || 0 },
      { key: 'expenses', value: Number(d.expenses) || 0 },
      { key: 'stock_loss', value: Number(d.stock_loss) || 0 },
      { key: 'profit', value: Math.max(0, Number(d.net_profit) || 0) },
    ].filter(p => p.value > 0);
    const total = parts.reduce((s, p) => s + p.value, 0) || 1;
    // Normalise across the drawn parts so the bar always sums to 100%, even
    // in a loss month where cost alone exceeds revenue.
    return parts.map(p => ({ ...p, pct: Math.max(1, Math.round(p.value / total * 100)) }));
  }

  /** Percent change vs the preceding window of equal length; null when there
   *  is no prior figure to compare against (0 → anything is not "+100%"). */
  delta(key: string): number | null {
    const prev = Number(this.data?.previous?.[key]);
    const curr = Number(this.data?.[key]);
    if (!this.data?.previous || !isFinite(prev) || !isFinite(curr) || prev === 0) return null;
    return Math.round((curr - prev) / Math.abs(prev) * 100);
  }

  print(): void { window.print(); }
}
