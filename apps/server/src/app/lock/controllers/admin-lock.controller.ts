import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { LockAdminService } from '../services/lock-admin.service';
import { CreateLockDto, UpdateLockDto } from '../dto/lock.dto';

@Controller('admin/locks')
export class AdminLockController {
  constructor(private readonly service: LockAdminService) {}

  @Post()
  create(@Body() dto: CreateLockDto) { return this.service.create(dto); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLockDto) { return this.service.update(id, dto); }

  @Get()
  findAll() { return this.service.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }
}
