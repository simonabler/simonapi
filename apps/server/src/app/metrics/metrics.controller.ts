import { Controller, Delete, Get, HttpCode, Query } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { RequiresAdminKey } from '../api-key/api-key.decorator';
import { MetricsService } from './metrics.service';
import { SkipMetrics } from './metrics.decorator';
import { SkipAnomalyGuard } from './anomaly.guard';
import { BlocklistService } from './blocklist.service';
import { VisitorService } from './visitor.service';

/**
 * Admin-only metrics & security dashboard.
 *
 * All routes require an `industrial` API key via `x-api-key` header.
 * Rate limiting is intentionally skipped — admin tooling must not be
 * blocked by its own counters.
 */
@ApiTags('Admin')
@ApiSecurity('x-api-key')
@SkipAnomalyGuard()
@Controller('admin/stats')
export class MetricsController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly blocklist: BlocklistService,
    private readonly visitor: VisitorService,
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

  // ── Visitor stats ──────────────────────────────────────────────────────────

  @Get('visitors/summary')
  @HttpCode(200)
  @SkipMetrics()
  @RequiresAdminKey()
  @ApiOperation({ summary: 'Visitor summary: unique IPs today / 7d / 30d with tier breakdown (admin)' })
  async visitorSummary() {
    return this.visitor.getSummary();
  }

  @Get('visitors/daily')
  @HttpCode(200)
  @SkipMetrics()
  @RequiresAdminKey()
  @ApiOperation({ summary: 'Daily unique IPs + request counts for the last N days (admin)' })
  async visitorDaily(@Query('days') days?: string) {
    const n = days ? Math.min(Math.max(parseInt(days, 10) || 30, 1), 90) : 30;
    return this.visitor.getDailyUnique(n);
  }

  @Get('visitors/by-api')
  @HttpCode(200)
  @SkipMetrics()
  @RequiresAdminKey()
  @ApiOperation({ summary: 'Unique IPs and request counts grouped by API (route group) for a given day (admin)' })
  async visitorByApi(@Query('day') day?: string) {
    return this.visitor.getByApi(day);
  }

  @Get('visitors/by-country')
  @HttpCode(200)
  @SkipMetrics()
  @RequiresAdminKey()
  @ApiOperation({ summary: 'Unique IPs grouped by country for a given day (admin)' })
  async visitorByCountry(@Query('day') day?: string) {
    return this.visitor.getByCountry(day);
  }
}
