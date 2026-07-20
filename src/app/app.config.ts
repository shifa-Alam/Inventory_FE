import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTranslateService, provideTranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader, provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    // authInterceptor: attaches CSRF + silently refreshes on 401.
    // errorInterceptor: toasts a proper message for every other failed request
    // (it deliberately ignores 401, which the auth layer is already handling).
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    ...provideTranslateHttpLoader({ prefix: '/assets/i18n/', suffix: '.json' }),
    provideTranslateService({ lang: 'en', loader: provideTranslateLoader(TranslateHttpLoader) })
  ]
};
