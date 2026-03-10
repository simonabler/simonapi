import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('reports')
export class ReportsController {
  @Get('public')
  getPublic() { return { ok: true }; }

  @Get('heavy')
  getHeavy() { return { ok: true }; }

  @Get('ratelimit')
  currentRateLimit(@Res({ passthrough: true }) res: Response) {
    // Reads the X-RateLimit-Tier / X-RateLimit-Key headers set by UsageInterceptor
    return {
      route: '/reports/ratelimit',
      tier:  res.getHeader('X-RateLimit-Tier') ?? 'anonymous',
      key:   res.getHeader('X-RateLimit-Key')  ?? 'unknown',
    };
  }
}
