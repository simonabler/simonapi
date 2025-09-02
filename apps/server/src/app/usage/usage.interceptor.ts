import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { UsageService } from './usage.service';

@Injectable()
export class UsageInterceptor implements NestInterceptor {
  constructor(private readonly usage: UsageService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req: any = context.switchToHttp().getRequest();
    const res: any = context.switchToHttp().getResponse();

    const path = req.originalUrl || req.url;
    const apiKey = req.headers['x-api-key'];
    const key = (typeof apiKey === 'string' && apiKey.trim()) || req.ip || 'anonymous';

    const check = this.usage.checkAndCount(key, path);
    if (!check.allowed) {
      throw new HttpException("Fair use limit exceeded", 429,{
      //throw new TooManyRequestsException({
      //  reason: check.reason,
      //  path,
      });
    }

    const started = Date.now();

    return next.handle().pipe(
      catchError((err) => {
        // record error with latency
        const latency = Date.now() - started;
        this.usage.recordOutcome(path, false, latency);
        return throwError(() => err);
      }),
      finalize(() => {
        // if no error recorded (i.e., success), record outcome here
        const latency = Date.now() - started;
        // Naive detection: if status < 400 -> ok
        const ok = res.statusCode < 400;
        this.usage.recordOutcome(path, ok, latency);
      }),
    );
  }
}

