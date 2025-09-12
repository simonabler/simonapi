import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { LockGroup } from '../entities/lock-group.entity';
import { LockGroupMember } from '../entities/lock-group.member.entity';
import { LockEntityDB } from '../entities/lock.entity';
import { CreateLockGroupDto, UpdateLockGroupDto } from '../dto/lock-group.dto';

@Injectable()
export class LockGroupService {
  constructor(
    @InjectRepository(LockGroup) private groups: Repository<LockGroup>,
    @InjectRepository(LockGroupMember) private members: Repository<LockGroupMember>,
    @InjectRepository(LockEntityDB) private locks: Repository<LockEntityDB>,
  ) {}

  create(dto: CreateLockGroupDto) {
    const g = this.groups.create(dto);
    return this.groups.save(g);
  }

  async update(id: string, dto: UpdateLockGroupDto) {
    const g = await this.groups.findOne({ where: { id } });
    if (!g) throw new NotFoundException('Group not found');
    Object.assign(g, dto);
    return this.groups.save(g);
  }

  findAll() { return this.groups.find({ relations: ['members'] }); }
  async findOne(id: string) {
    const g = await this.groups.findOne({ where: { id }, relations: ['members'] });
    if (!g) throw new NotFoundException('Group not found');
    return g;
  }

  async addMembers(groupId: string, lockIds: string[]) {
    await this.ensureGroup(groupId);
    const validLocks = await this.locks.find({ where: { id: In(lockIds) } });
    const toSave = validLocks.map(l => this.members.create({ groupId, lockId: l.id }));
    await this.members.save(toSave);
    return this.findOne(groupId);
  }

  async removeMembers(groupId: string, lockIds: string[]) {
    await this.ensureGroup(groupId);
    await this.members.delete({ groupId, lockId: In(lockIds) });
    return this.findOne(groupId);
  }

  private async ensureGroup(id: string) {
    const g = await this.groups.findOne({ where: { id } });
    if (!g) throw new NotFoundException('Group not found');
  }
}
