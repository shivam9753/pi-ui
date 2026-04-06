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

// Auth endpoints that should never trigger session-expired flow
const AUTH_ENDPOINTS = ['/auth/login', '/auth/google-login', '/auth/register', '/auth/refresh'];

function authInterceptor(req: any, next: any) {
  const platformId = inject(PLATFORM_ID);
  const modalService = inject(ModalService);
  const authService = inject(AuthService);

  let token: string | null = null;

  // Add JWT token to request headers if available
  if (isPlatformBrowser(platformId)) {
    token = localStorage.getItem('jwt_token');
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
      const isAuthEndpoint = AUTH_ENDPOINTS.some(path => req.url.includes(path));

      if (
        error.status === 401 &&
        token &&
        !isAuthEndpoint &&
        !hasShownExpiredDialog
      ) {
        hasShownExpiredDialog = true;

        authService.signOut();

        modalService.alert(
          'Session Expired',
          'Your session has expired. Please log in again to continue.'
        ).then(() => {
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
