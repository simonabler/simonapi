import { Controller, Get, HttpCode, Query } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { SkipMetrics } from './metrics.decorator';
import { BlocklistService } from './blocklist.service';

@Controller()
export class MetricsController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly blocklist: BlocklistService,
  ) {}

  @Get('_stats')
  @HttpCode(200)
  @SkipMetrics()
  getStats() {
    return this.metrics.snapshot();
  }

  @Get('_stats/reset')
  @HttpCode(200)
  @SkipMetrics()
  async reset() {
    await this.metrics.reset();
    return { ok: true };
  }

  @Get('_stats/security')
  @HttpCode(200)
  @SkipMetrics()
  security() {
    return {
      blocked: this.blocklist.list(),
    };
  }

  @Get('_stats/security/unban')
  @HttpCode(200)
  @SkipMetrics()
  unban(@Query('ip') ip: string) {
    if (!ip) return { ok: false, error: 'ip required' };
    const ok = this.blocklist.unban(ip);
    return { ok };
  }
}
