import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { ApiKeyService } from './api-key.service';
import { ApiKeyTier } from './entities/api-key.entity';

@ApiExcludeController()
@Controller('_admin/api-keys')
export class ApiKeyAdminController {
  constructor(private readonly svc: ApiKeyService) {}

  private guard(token?: string) {
    const expected = process.env.ADMIN_TOKEN;
    if (!expected || token !== expected) {
      throw new UnauthorizedException('Invalid admin token');
    }
  }

  @Get()
  list(@Headers('x-admin-token') token?: string) {
    this.guard(token);
    return this.svc.list();
  }

  @Post()
  async create(
    @Headers('x-admin-token') token: string | undefined,
    @Body() body: { label: string; tier: ApiKeyTier; expiresAt?: string },
  ) {
    this.guard(token);
    const expires = body.expiresAt ? new Date(body.expiresAt) : undefined;
    const { rawKey, entity } = await this.svc.create(body.label, body.tier, expires);
    return {
      message: 'Key created — store the rawKey now, it will not be shown again',
      rawKey,
      id: entity.id,
      tier: entity.tier,
      label: entity.label,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @Headers('x-admin-token') token: string | undefined,
    @Param('id') id: string,
  ) {
    this.guard(token);
    await this.svc.revoke(id);
  }
}
