import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { RequiresAdminKey } from './api-key.decorator';
import { ApiKeyService } from './api-key.service';
import { ApiKeyTier } from './entities/api-key.entity';

@ApiTags('Admin')
@ApiSecurity('x-api-key')
@Controller('admin/api-keys')
export class ApiKeyAdminController {
  constructor(private readonly svc: ApiKeyService) {}

  @Get()
  @RequiresAdminKey()
  @ApiOperation({ summary: 'List all API keys (admin)' })
  list() {
    return this.svc.list();
  }

  @Post()
  @RequiresAdminKey()
  @ApiOperation({ summary: 'Create a new API key (admin)' })
  async create(
    @Body() body: { label: string; tier: ApiKeyTier; expiresAt?: string },
  ) {
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
  @RequiresAdminKey()
  @ApiOperation({ summary: 'Revoke an API key (admin)' })
  async revoke(@Param('id') id: string) {
    await this.svc.revoke(id);
  }
}
