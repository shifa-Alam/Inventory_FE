import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../testing/test-providers';

import { PurchaseComponent } from './purchase.component';

describe('PurchaseComponent', () => {
  let component: PurchaseComponent;
  let fixture: ComponentFixture<PurchaseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseComponent],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('recomputes the line + grand total when the scanner increments an existing item', () => {
    // A line already on the sheet at qty 1 (total 12).
    component.items = [{ product_id: 1, product_name: 'Widget', quantity: 1, rate: 12, total: 12 }];

    // Scanning the same product again increments quantity...
    (component as any).addOrIncrement({ id: 1, name: 'Widget' });

    const line = component.items[0];
    expect(line.quantity).toBe(2);
    expect(line.total).toBe(24);           // ...and the line total must follow
    expect(component.getTotal()).toBe(24); // ...so the grand total stays correct
  });
});
