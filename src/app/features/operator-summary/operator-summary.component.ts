import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { localDateStr } from '../../shared/utils/date.utils';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-operator-summary',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './operator-summary.component.html',
  styleUrls: ['./operator-summary.component.css']
})
export class OperatorSummaryComponent implements OnInit {

  dateFrom = localDateStr();
  dateTo   = localDateStr();

  operators: any[] = [];
  grand: any = { total_cash_in: 0, discount_given: 0, return_amount: 0, net_cash: 0, total_txn: 0 };
  dateLabel = '';
  loading = false;

  expandedOp: string | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    const params: Record<string, any> = {};
    if (this.dateFrom) params['date_from'] = this.dateFrom;
    if (this.dateTo)   params['date_to']   = this.dateTo;
    const qs = new URLSearchParams(params).toString();
    this.api.get(`/payment-ledger/operator-summary${qs ? '?' + qs : ''}`).subscribe({
      next: (res: any) => {
        this.operators = res.operators ?? [];
        this.grand     = res.grand ?? {};
        this.dateLabel = res.date ?? '';
        this.loading   = false;
      },
      error: () => { this.loading = false; }
    });
  }

  setToday(): void {
    this.dateFrom = localDateStr(); this.dateTo = localDateStr(); this.load();
  }

  setThisMonth(): void {
    const now = new Date();
    this.dateFrom = localDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
    this.dateTo   = localDateStr(now);
    this.load();
  }

  setThisWeek(): void {
    const now = new Date();
    const sun = new Date(now); sun.setDate(now.getDate() - now.getDay());
    this.dateFrom = localDateStr(sun);
    this.dateTo   = localDateStr(now);
    this.load();
  }

  toggleExpand(op: string): void {
    this.expandedOp = this.expandedOp === op ? null : op;
  }

  share(op: any): string {
    if (!this.grand.total_cash_in) return '0';
    return ((op.total_cash_in / this.grand.total_cash_in) * 100).toFixed(1);
  }
}
