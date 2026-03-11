import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { timeout, catchError } from 'rxjs/operators';
import { throwError, TimeoutError } from 'rxjs';
import { ToastService } from './toast.service';

/**
 * Aborts any HTTP request that takes longer than TIMEOUT_MS.
 * Long-running operations (watermark processing, GS1 batch) are covered.
 * On timeout, shows a toast and re-throws so callers can react if needed.
 */
const TIMEOUT_MS = 30_000;

export const timeoutInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    timeout(TIMEOUT_MS),
    catchError((err: unknown) => {
      if (err instanceof TimeoutError) {
        toast.show(
          'error',
          'Request timed out',
          `No response after ${TIMEOUT_MS / 1000}s. Check your connection and try again.`,
        );
        return throwError(() => new HttpErrorResponse({ status: 0, statusText: 'Timeout' }));
      }
      return throwError(() => err);
    }),
  );
};
