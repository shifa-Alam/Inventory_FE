import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig).catch(() => {
  // Bootstrap errors are unrecoverable — silently fail so nothing
  // sensitive is exposed in the browser console in production.
});
