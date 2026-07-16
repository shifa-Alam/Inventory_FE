import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-aging',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './aging.component.html',
  styleUrls: ['./aging.component.css']
})
export class AgingComponent implements OnInit {
  /** which ledger side is on screen */
  tab: 'customer' | 'supplier' = 'customer';

  loading = false;
  asOf = '';
  rows: any[] = [];
  totals: any = { b0_30: 0, b31_60: 0, b61_90: 0, b90_plus: 0, total: 0 };

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.load(); }

  setTab(tab: 'customer' | 'supplier'): void {
    if (this.tab === tab) return;
    this.tab = tab;
    this.load();
  }

  load(): void {
    this.loading = true;
    const url = this.tab === 'customer' ? '/reports/customer-aging' : '/reports/supplier-aging';
    this.api.get(url).subscribe({
      next: (res: any) => {
        this.asOf = res.as_of;
        this.rows = res.rows ?? [];
        this.totals = res.totals ?? this.totals;
        this.loading = false;
      },
      error: () => { this.rows = []; this.loading = false; }
    });
  }

  fmt(n: number | null | undefined): string {
    return (Math.round((n ?? 0) * 100) / 100).toLocaleString('en-US');
  }

  /** share of the total sitting in the risky 61+ buckets */
  riskShare(): number {
    if (!this.totals.total) return 0;
    return Math.round((this.totals.b61_90 + this.totals.b90_plus) / this.totals.total * 100);
  }
}
