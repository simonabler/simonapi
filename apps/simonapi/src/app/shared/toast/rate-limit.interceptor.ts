import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from './toast.service';

/**
 * Globally catches 429 responses from our API and shows a toast.
 * Passes the error through so callers can still handle it locally.
 */
export const rateLimitInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 429) {
        const retryAfter: number | undefined =
          err.error?.retryAfter ?? (Number(err.headers.get('retry-after')) || undefined);
        toast.rateLimitExceeded(retryAfter);
      }
      return throwError(() => err);
    }),
  );
};
