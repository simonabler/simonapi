import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { RequiresTier } from '../api-key/api-key.decorator';
import { UsageService } from './usage.service';

/**
 * Rate-limit usage snapshot — admin only.
 * Secured via x-api-key (industrial tier), same as /admin/stats.
 */
@ApiTags('Admin')
@ApiSecurity('x-api-key')
@Controller('admin/usage')
export class UsageController {
  constructor(private readonly usage: UsageService) {}

  @Get('stats')
  @RequiresTier('industrial')
  @ApiOperation({ summary: 'Rate-limit counters snapshot (admin)' })
  getStats() {
    return this.usage.snapshot();
  }

  @Post('reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequiresTier('industrial')
  @ApiOperation({ summary: 'Reset rate-limit counters (admin)' })
  reset() {
    this.usage.resetAll();
  }
}
