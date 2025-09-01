import { Controller, Get, Res } from '@nestjs/common';
import { Throttle, SkipThrottle, seconds } from '@nestjs/throttler';
import { Response } from 'express';

@SkipThrottle() // ganzen Controller ausnehmen …
@Controller('reports')
export class ReportsController {
  @Get('public')
  getPublic() { return { ok: true }; }

  // … aber für einzelne Route wieder aktivieren/verschärfen:
  @Throttle({ default: { limit: 10, ttl: seconds(10) } })
  @Get('heavy')
  getHeavy() { return { ok: true }; }



 @Get('ratelimit')
  currentRateLimit(@Res({ passthrough: true }) res: Response) {
    // Falls du mehrere Throttler-Sets nutzt (z.B. 'default', 'short', 'long'),
    // kannst du hier weitere Suffixe ergänzen:
    const sets = ['', '-short', '-long'];

    const data: Record<string, any> = {};
    for (const s of sets) {
      const limit = res.getHeader(`X-RateLimit-Limit${s}`);
      if (limit === undefined) continue; // Set existiert evtl. nicht für diese Route
      data[s || 'default'] = {
        limit: Number(limit),
        remaining: Number(res.getHeader(`X-RateLimit-Remaining${s}`)),
        resetMs: Number(res.getHeader(`X-RateLimit-Reset${s}`)),
      };
    }
    return { route: '/reports/ratelimit', rateLimit: data };
  }


}
