import { Controller, Get, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { UsageService } from './usage.service';

@Controller('_usage')
export class UsageController {
  constructor(private readonly usage: UsageService) {}

  private authOk(token?: string) {
    const adminToken = this.usage.getAdminToken();
    return !!adminToken && token === adminToken;
  }

  @Get('stats')
  getStats(@Headers('x-admin-token') token?: string) {
    if (!this.authOk(token)) {
      return { error: 'unauthorized' };
    }
    return this.usage.snapshot();
  }

  @Post('reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  reset(@Headers('x-admin-token') token?: string) {
    if (!this.authOk(token)) return { error: 'unauthorized' };
    this.usage.resetAll();
    return;
  }
}

