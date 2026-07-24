import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../testing/test-providers';

import { PurchaseViewComponent } from './purchase-view.component';

describe('PurchaseViewComponent', () => {
  let component: PurchaseViewComponent;
  let fixture: ComponentFixture<PurchaseViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseViewComponent],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
