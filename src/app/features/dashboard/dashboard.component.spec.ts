import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../testing/test-providers';

import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Receivables aging bar ──
  // The bar is pure geometry over the API's buckets, so the arithmetic is worth
  // pinning: a wrong width here misreports how much money has gone stale.
  describe('aging bar', () => {
    function withAging(aging: any) {
      component.data = { receivables_aging: aging };
    }

    it('reads zero from a tenant with nothing owed, so no bar is drawn', () => {
      withAging({ b0_30: 0, b31_60: 0, b61_90: 0, b90_plus: 0, total: 0, overdue: 0 });
      expect(component.agingTotal).toBe(0);
      expect(component.agingOverdueShare).toBe(0);
      expect(component.agingPct('b0_30')).toBe(0);
    });

    it('survives the response arriving late, before any data is set', () => {
      component.data = {};
      expect(component.agingTotal).toBe(0);
      expect(component.agingOverdueShare).toBe(0);
      expect(component.agingPct('b90_plus')).toBe(0);
    });

    it('turns each bucket into its share of the total', () => {
      withAging({ b0_30: 5000, b31_60: 2500, b61_90: 1500, b90_plus: 1000, total: 10000, overdue: 5000 });
      expect(component.agingPct('b0_30')).toBe(50);
      expect(component.agingPct('b31_60')).toBe(25);
      expect(component.agingPct('b61_90')).toBe(15);
      expect(component.agingPct('b90_plus')).toBe(10);
    });

    it('floors a tiny-but-real bucket at 1% so it stays visible', () => {
      // 50 of 100000 rounds to 0% — which would hide a real, aged receivable.
      withAging({ b0_30: 99950, b31_60: 0, b61_90: 0, b90_plus: 50, total: 100000, overdue: 50 });
      expect(component.agingPct('b90_plus')).toBe(1);
    });

    it('keeps an empty bucket at zero rather than flooring it', () => {
      withAging({ b0_30: 10000, b31_60: 0, b61_90: 0, b90_plus: 0, total: 10000, overdue: 0 });
      expect(component.agingPct('b31_60')).toBe(0);
    });

    it('reports the overdue share as a whole percent', () => {
      withAging({ b0_30: 6000, b31_60: 4000, b61_90: 0, b90_plus: 0, total: 10000, overdue: 4000 });
      expect(component.agingOverdueShare).toBe(40);
    });
  });
});
