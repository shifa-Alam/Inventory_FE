import { EnvironmentProviders, Provider } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideTranslateService, TranslateNoOpLoader, TranslateLoader } from '@ngx-translate/core';

// Shared providers for standalone-component unit tests: real HttpClient backed
// by the testing backend (no network), a stub router, no-op animations for
// Material, and a translate service with a no-op loader (no i18n HTTP).
export const testProviders: Array<Provider | EnvironmentProviders> = [
  provideHttpClient(),
  provideHttpClientTesting(),
  provideRouter([]),
  provideNoopAnimations(),
  provideTranslateService({
    loader: { provide: TranslateLoader, useClass: TranslateNoOpLoader },
  }),
];
