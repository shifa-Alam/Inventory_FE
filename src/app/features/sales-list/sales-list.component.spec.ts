import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { testProviders } from '../../testing/test-providers';

import { SalesListComponent } from './sales-list.component';

describe('SalesListComponent', () => {
  let component: SalesListComponent;
  let fixture: ComponentFixture<SalesListComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesListComponent],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalesListComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();          // ngOnInit -> load()
  });

  /** Flush any requests the component fired on init (e.g. the sales list). */
  function flushPending() {
    httpMock.match(() => true).forEach(r => r.flush({ data: [], total: 0 }));
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('filters customers via the backend `name` param, not the ignored `search`', fakeAsync(() => {
    flushPending();                   // clear the ngOnInit sales load
    component.customerSearch = 'cola';
    component.onCustomerInput();
    tick(280);                        // debounce timer

    const reqs = httpMock.match(r => r.url.includes('/customers/'));
    expect(reqs.length).toBe(1);
    expect(reqs[0].request.url).toContain('name=cola');
    expect(reqs[0].request.url).not.toContain('search=');
    reqs[0].flush({ data: [], total: 0 });
  }));
});
