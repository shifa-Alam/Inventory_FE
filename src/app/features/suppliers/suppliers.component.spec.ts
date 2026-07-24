import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../testing/test-providers';

import { SuppliersComponent } from './suppliers.component';

describe('SuppliersComponent', () => {
  let component: SuppliersComponent;
  let fixture: ComponentFixture<SuppliersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuppliersComponent],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuppliersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
