import { ApplicationConfig, provideZoneChangeDetection, inject, APP_INITIALIZER, PLATFORM_ID } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors, HttpErrorResponse } from '@angular/common/http';
import { routes } from './app.routes';
import { LoaderService } from './services/loader.service';
import { finalize, catchError, throwError } from 'rxjs';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { MetaInitializerService, metaInitializerFactory } from './services/meta-initializer.service';
import { ModalService } from './services/modal.service';
import { AuthService } from './services/auth.service';
import { isPlatformBrowser } from '@angular/common';

// Auth initializer factory to restore session before app renders
function authInitializerFactory(authService: AuthService, platformId: Object) {
  return () => {
    // Only restore session in browser environment
    if (isPlatformBrowser(platformId)) {
      // Force restore session synchronously
      authService.forceRestoreSession();
    }
    // Return resolved promise to complete initialization
    return Promise.resolve();
  };
}

// Functional interceptor for Angular 17+
function loaderInterceptor(req: any, next: any) {
  const loaderService = inject(LoaderService);

  loaderService.show();

  return next(req).pipe(
    finalize(() => loaderService.hide())
  );
}

// Auth interceptor for handling token expiration
let hasShownExpiredDialog = false;

function authInterceptor(req: any, next: any) {
  const platformId = inject(PLATFORM_ID);
  const modalService = inject(ModalService);
  const authService = inject(AuthService);

  // Add JWT token to request headers if available
  if (isPlatformBrowser(platformId)) {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Check if error is 401 Unauthorized (token expired or invalid)
      if (error.status === 401 && !hasShownExpiredDialog) {
        hasShownExpiredDialog = true;

        // Show session expired dialog
        modalService.alert(
          'Session Expired',
          'Your session has expired. Please log in again to continue.'
        ).then(() => {
          // Clear the session and redirect to login
          authService.signOut();

          // Reset the flag so it can show again in the future
          hasShownExpiredDialog = false;
        });
      }

      return throwError(() => error);
    })
  );
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'disabled' })),
    provideHttpClient(withInterceptors([authInterceptor, loaderInterceptor])),
    provideClientHydration(withEventReplay()),
    {
      provide: APP_INITIALIZER,
      useFactory: metaInitializerFactory,
      deps: [MetaInitializerService],
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: authInitializerFactory,
      deps: [AuthService, PLATFORM_ID],
      multi: true
    }
  ]
};
