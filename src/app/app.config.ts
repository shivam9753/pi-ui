import { ApplicationConfig, provideZoneChangeDetection, inject } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { LoaderService } from './services/loader.service';
import { finalize } from 'rxjs/operators';

// Functional interceptor for Angular 17+
function loaderInterceptor(req: any, next: any) {
  const loaderService = inject(LoaderService);
  
  loaderService.show();
  
  return next(req).pipe(
    finalize(() => loaderService.hide())
  );
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'disabled' })), 
    provideHttpClient(withInterceptors([loaderInterceptor]))
  ]
};
