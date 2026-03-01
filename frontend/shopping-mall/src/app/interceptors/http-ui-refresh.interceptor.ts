import { Injectable, ApplicationRef } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Injectable()
export class HttpUiRefreshInterceptor implements HttpInterceptor {
  constructor(private appRef: ApplicationRef) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      // In zoneless mode, force a render pass after async HTTP completion.
      finalize(() => this.appRef.tick()),
    );
  }
}
