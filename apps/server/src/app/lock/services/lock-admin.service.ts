import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LockEntityDB } from '../entities/lock.entity';
import { CreateLockDto, UpdateLockDto } from '../dto/lock.dto';

@Injectable()
export class LockAdminService {
  constructor(@InjectRepository(LockEntityDB) private repo: Repository<LockEntityDB>) {}

  create(dto: CreateLockDto) {
    const ent = this.repo.create({ ...dto, providerConfig: dto.providerConfig ?? {}, active: true });
    return this.repo.save(ent);
  }

  async update(id: string, dto: UpdateLockDto) {
    const ent = await this.repo.findOne({ where: { id } });
    if (!ent) throw new NotFoundException('Lock not found');
    Object.assign(ent, dto);
    return this.repo.save(ent);
  }

  findAll() { return this.repo.find(); }
  async findOne(id: string) {
    const ent = await this.repo.findOne({ where: { id } });
    if (!ent) throw new NotFoundException('Lock not found');
    return ent;
  }
}
