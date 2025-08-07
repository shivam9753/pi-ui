import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoaderService } from '../services/loader.service';

@Injectable()
export class LoaderInterceptor implements HttpInterceptor {
  private activeRequests = 0;

  constructor(private loaderService: LoaderService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Increment active requests and show loader if first request
    this.activeRequests++;
    if (this.activeRequests === 1) {
      this.loaderService.show();
    }

    return next.handle(req).pipe(
      finalize(() => {
        // Decrement active requests and hide loader if no more requests
        this.activeRequests--;
        if (this.activeRequests === 0) {
          this.loaderService.hide();
        }
      })
    );
  }
}