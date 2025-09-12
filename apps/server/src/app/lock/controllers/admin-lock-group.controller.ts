import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { LockGroupService } from '../services/lock-group.service';
import { CreateLockGroupDto, UpdateLockGroupDto, UpsertGroupMembersDto } from '../dto/lock-group.dto';

@Controller('admin/lock-groups')
export class AdminLockGroupController {
  constructor(private readonly service: LockGroupService) {}

  @Post()
  create(@Body() dto: CreateLockGroupDto) { return this.service.create(dto); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLockGroupDto) { return this.service.update(id, dto); }

  @Get()
  findAll() { return this.service.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post(':id/members')
  addMembers(@Param('id') id: string, @Body() body: UpsertGroupMembersDto) {
    return this.service.addMembers(id, body.lockIds);
  }

  @Post(':id/members/remove')
  removeMembers(@Param('id') id: string, @Body() body: UpsertGroupMembersDto) {
    return this.service.removeMembers(id, body.lockIds);
  }
}
