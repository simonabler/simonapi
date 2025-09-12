import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { AccessLinkService } from '../services/access-link.service';
import { CreateAccessLinkDto } from '../dto/access-link.dto';

@Controller('admin/access-links')
export class AdminAccessLinkController {
  constructor(private readonly service: AccessLinkService) {}

  @Post()
  create(@Body() dto: CreateAccessLinkDto, @Req() req: any) {
    const baseUrl = process.env.PUBLIC_BASE_URL || 'https://abler.tirol';
    const createdByUserId = req.user?.id;
    return this.service.create(dto, { baseUrl, createdByUserId });
  }

  @Get()
  findAll() { return this.service.findAll(); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() patch: any) {
    const allowed = (({ revoked, validFrom, validTo, maxUses }) => ({ revoked, validFrom, validTo, maxUses }))(patch);
    return this.service.update(id, allowed);
  }
}
