import { ApplicationConfig, provideZoneChangeDetection, inject, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { LoaderService } from './services/loader.service';
import { finalize } from 'rxjs/operators';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { MetaInitializerService, metaInitializerFactory } from './services/meta-initializer.service';

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
    provideHttpClient(withInterceptors([loaderInterceptor])), 
    provideClientHydration(withEventReplay()),
    {
      provide: APP_INITIALIZER,
      useFactory: metaInitializerFactory,
      deps: [MetaInitializerService],
      multi: true
    }
  ]
};
