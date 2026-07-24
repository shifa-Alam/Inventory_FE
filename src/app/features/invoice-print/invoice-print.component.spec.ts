import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { testProviders } from '../../testing/test-providers';
import { TenantSettingsService, DEFAULT_INVOICE_SETTINGS } from '../../core/services/tenant-settings.service';

import { InvoicePrintComponent } from './invoice-print.component';

describe('InvoicePrintComponent', () => {
  let component: InvoicePrintComponent;
  let fixture: ComponentFixture<InvoicePrintComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvoicePrintComponent],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvoicePrintComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('InvoicePrintComponent auto-print', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvoicePrintComponent],
      providers: [
        ...testProviders,
        { provide: ActivatedRoute, useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: '5' }),
              queryParamMap: convertToParamMap({ print: '1' }),
            },
        }},
        // Cached settings emit synchronously on subscribe (shareReplay in prod),
        // i.e. before the invoice HTTP call resolves — the exact race the fix targets.
        { provide: TenantSettingsService, useValue: { getSettings: () => of(DEFAULT_INVOICE_SETTINGS) } },
      ],
    }).compileComponents();
  });

  it('auto-prints once even when settings resolve before the invoice loads', fakeAsync(() => {
    const printSpy = spyOn(window, 'print');

    const fixture = TestBed.createComponent(InvoicePrintComponent);
    fixture.detectChanges();   // ngOnInit: settings emit first (invoice still null), /sales/5 pending

    const httpMock = TestBed.inject(HttpTestingController);
    httpMock.expectOne(r => r.url.includes('/sales/5')).flush({ id: 5, items: [] });

    tick(1200);                // the deferred window.print()
    expect(printSpy).toHaveBeenCalledTimes(1);
  }));
});
