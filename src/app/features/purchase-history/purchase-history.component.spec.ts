import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../testing/test-providers';

import { PurchaseHistoryComponent } from './purchase-history.component';

describe('PurchaseHistoryComponent', () => {
  let component: PurchaseHistoryComponent;
  let fixture: ComponentFixture<PurchaseHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseHistoryComponent],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
