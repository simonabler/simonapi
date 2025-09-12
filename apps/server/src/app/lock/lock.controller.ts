import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { LockService } from './services/lock.service';
import { LockEntityDB } from './entities/lock.entity';
import { AccessLink } from './entities/access-link.entity';
import { LockGroupMember } from './entities/lock-group.member.entity';
import { sha256 } from './util/token.util';

@Controller('lock')
export class LockController {
  constructor(
    private readonly lockService: LockService,
    @InjectRepository(AccessLink) private readonly linkRepo: Repository<AccessLink>,
    @InjectRepository(LockGroupMember) private readonly memberRepo: Repository<LockGroupMember>,
    @InjectRepository(LockEntityDB) private readonly lockRepo: Repository<LockEntityDB>,
  ) {}

  @Post('open')
  async open(@Body() body: { lock: LockEntityDB }) {
    // In der echten App: Lock anhand ID laden, Link/Token prüfen, Audit schreiben.
    return this.lockService.open(body.lock);
  }

  // GET /lock/locks?slug=...&t=...
  @Get('locks')
  async getLocks(@Query('slug') slug?: string, @Query('t') t?: string) {
    if (!slug || !t) throw new BadRequestException('slug and t are required');

    const link = await this.linkRepo.findOne({ where: { slug } });
    if (!link) throw new BadRequestException('invalid link');
    if (link.revoked) throw new BadRequestException('link revoked');

    const now = new Date();
    if (now < link.validFrom) throw new BadRequestException('link not yet valid');
    if (now > link.validTo) throw new BadRequestException('link expired');

    const tokenOk = link.tokenHash === sha256(t);
    if (!tokenOk) throw new BadRequestException('invalid token');

    // Collect allowed lock IDs from link + groups
    const idSet = new Set<string>(link.allowedLockIds || []);
    if (link.allowedGroupIds?.length) {
      const members = await this.memberRepo.find({ where: { groupId: In(link.allowedGroupIds) } });
      for (const m of members) idSet.add(m.lockId);
    }
    const ids = Array.from(idSet);
    if (ids.length === 0) {
      return { locks: [], validFrom: link.validFrom.toISOString(), validTo: link.validTo.toISOString() };
    }
    const locks = await this.lockRepo.find({ where: { id: In(ids), active: true }, order: { name: 'ASC' } });
    const items = locks.map((l) => ({ id: l.id, name: l.name }));
    return { locks: items, validFrom: link.validFrom.toISOString(), validTo: link.validTo.toISOString() };
  }
}
