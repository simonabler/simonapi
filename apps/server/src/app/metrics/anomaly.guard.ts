import { CanActivate, ExecutionContext, Injectable, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BlocklistService } from './blocklist.service';

export const SKIP_SECURITY = 'skip_security';
export const SkipAnomalyGuard = () => SetMetadata(SKIP_SECURITY, true);

@Injectable()
export class AnomalyGuard implements CanActivate {
  constructor(private readonly blocklist: BlocklistService, private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.get<boolean>(SKIP_SECURITY, context.getHandler()) ||
                 this.reflector.get<boolean>(SKIP_SECURITY, context.getClass());
    if (skip) return true;

    const req = context.switchToHttp().getRequest();
    const ip = (req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
               req?.ip || req?.socket?.remoteAddress || 'unknown';

    const res = this.blocklist.isBlocked(ip);
    if (res.blocked) {
      const err: any = new ForbiddenException({
        message: 'Temporarily blocked due to anomalous activity',
        reason: res.entry?.reason,
        remainingMs: res.remainingMs,
        strikes: res.entry?.strikes,
      });
      (err as any).status = 429;
      throw err;
    }
    return true;
  }
}
