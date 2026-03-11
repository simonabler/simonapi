import { Controller, Delete, Get, HttpCode, Query } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { RequiresAdminKey } from '../api-key/api-key.decorator';
import { MetricsService } from './metrics.service';
import { SkipMetrics } from './metrics.decorator';
import { BlocklistService } from './blocklist.service';

/**
 * Admin-only metrics & security dashboard.
 *
 * All routes require an `industrial` API key via `x-api-key` header.
 * Rate limiting is intentionally skipped — admin tooling must not be
 * blocked by its own counters.
 */
@ApiTags('Admin')
@ApiSecurity('x-api-key')
@Controller('admin/stats')
export class MetricsController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly blocklist: BlocklistService,
  ) {}

  @Get()
  @HttpCode(200)
  @SkipMetrics()
  @RequiresAdminKey()
  @ApiOperation({ summary: 'Request metrics snapshot (admin)' })
  getStats() {
    return this.metrics.snapshot();
  }

  @Delete('reset')
  @HttpCode(200)
  @SkipMetrics()
  @RequiresAdminKey()
  @ApiOperation({ summary: 'Reset metrics counters (admin)' })
  async reset() {
    await this.metrics.reset();
    return { ok: true };
  }

  @Get('security')
  @HttpCode(200)
  @SkipMetrics()
  @RequiresAdminKey()
  @ApiOperation({ summary: 'List currently blocked IPs (admin)' })
  security() {
    return { blocked: this.blocklist.list() };
  }

  @Get('security/unban')
  @HttpCode(200)
  @SkipMetrics()
  @RequiresAdminKey()
  @ApiOperation({ summary: 'Unban an IP address (admin)' })
  unban(@Query('ip') ip: string) {
    if (!ip) return { ok: false, error: 'ip required' };
    const ok = this.blocklist.unban(ip);
    return { ok };
  }
}
