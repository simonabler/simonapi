import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  GoneException,
  NotFoundException,
  Post,
  UnauthorizedException,
  Req,
  Get,
  Query,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { LockService } from './services/lock.service';
import { AccessLink } from './entities/access-link.entity';
import { LockEntityDB } from './entities/lock.entity';
import { LockGroupMember } from './entities/lock-group.member.entity';
import { AccessEvent } from './entities/access-event.entity';
import { sha256 } from './util/token.util';

type OpenBody = {
  slug: string;        // public Link Slug
  token: string;       // opaquer Token (wird gegen Hash geprüft)
  lockId: string;      // Ziel-Lock
  swipeNonce?: string; // optionaler Einmal-Nonce vom Client
  pin?: string;        // falls Link PIN erfordert
};

@Controller('lock')
export class LockController {
  constructor(
    private readonly lockService: LockService,
    @InjectRepository(AccessLink) private readonly links: Repository<AccessLink>,
    @InjectRepository(LockEntityDB) private readonly locks: Repository<LockEntityDB>,
    @InjectRepository(LockGroupMember) private readonly members: Repository<LockGroupMember>,
    @InjectRepository(AccessEvent) private readonly events: Repository<AccessEvent>,
  ) {}

  @Post('open')
  async open(@Body() body: OpenBody, @Req() req: any) {
    const { slug, token, lockId, swipeNonce, pin } = body || ({} as OpenBody);
    const now = new Date();

    if (!slug || !token || !lockId) {
      throw new BadRequestException('slug, token and lockId are required');
    }

    const link = await this.links.findOne({ where: { slug } });
    if (!link) throw new NotFoundException('Access link not found');

    if (link.revoked) throw new GoneException('Access link revoked');
    if (!(link.validFrom <= now && now <= link.validTo)) {
      throw new ForbiddenException('Access link not within valid time window');
    }

    const tokenHash = sha256(token);
    if (tokenHash !== link.tokenHash) {
      await this.audit(link.id, lockId, 'OPEN', 'FAILED', 'INVALID_TOKEN', req, undefined);
      throw new UnauthorizedException('Invalid token');
    }

    if (link.requirePin) {
      if (!pin) {
        await this.audit(link.id, lockId, 'OPEN', 'FAILED', 'PIN_REQUIRED', req, undefined);
        throw new UnauthorizedException('PIN required');
      }
      const pinHash = sha256(pin);
      if (pinHash !== link.pinHash) {
        await this.audit(link.id, lockId, 'OPEN', 'FAILED', 'PIN_INVALID', req, undefined);
        throw new UnauthorizedException('Invalid PIN');
      }
    }

    if (typeof link.maxUses === 'number' && link.maxUses >= 1 && link.usedCount >= link.maxUses) {
      await this.audit(link.id, lockId, 'OPEN', 'FAILED', 'MAX_USES_REACHED', req, undefined);
      throw new ForbiddenException('Max uses reached');
    }

    const allowedLockIds = await this.resolveAllowedLockIds(link.allowedLockIds, link.allowedGroupIds);
    if (!allowedLockIds.includes(lockId)) {
      await this.audit(link.id, lockId, 'OPEN', 'FAILED', 'LOCK_NOT_ALLOWED', req, undefined);
      throw new ForbiddenException('Lock not allowed for this link');
    }

    const lock = await this.locks.findOne({ where: { id: lockId } });
    if (!lock) {
      await this.audit(link.id, lockId, 'OPEN', 'FAILED', 'LOCK_NOT_FOUND', req, undefined);
      throw new NotFoundException('Lock not found');
    }
    if (!lock.active) {
      await this.audit(link.id, lockId, 'OPEN', 'FAILED', 'LOCK_INACTIVE', req, undefined);
      throw new ForbiddenException('Lock inactive');
    }

    const result = await this.lockService.open(lock);

    await this.audit(
      link.id,
      lockId,
      'OPEN',
      result.ok ? 'SUCCESS' : 'FAILED',
      typeof result.detail === 'string' ? result.detail : JSON.stringify(result.detail ?? {}),
      req,
      swipeNonce,
      lock,
    );

    if (result.ok) {
      try {
        await this.links.update({ id: link.id }, { usedCount: (link.usedCount ?? 0) + 1 });
      } catch {
        // soft fail
      }
    }

    return {
      ok: result.ok,
      detail: result.detail ?? null,
      lockId,
      slug,
      validTo: link.validTo.toISOString(),
      remainingUses:
        typeof link.maxUses === 'number' ? Math.max(0, link.maxUses - ((link.usedCount ?? 0) + (result.ok ? 1 : 0))) : null,
    };
  }

  /**
   * GET /lock/locks?slug=...&t=...
   * Liefert alle für den Link sichtbaren und aktiven Locks (inkl. via Gruppen zugewiesener),
   * plus Zeitfenster (validFrom/validTo). Token, Revocation und Zeitfenster werden geprüft.
   */
  @Get('locks')
  async getLocks(@Query('slug') slug?: string, @Query('t') t?: string) {
    if (!slug || !t) throw new BadRequestException('slug and t are required');

    const link = await this.links.findOne({ where: { slug } });
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
      const members = await this.members.find({ where: { groupId: In(link.allowedGroupIds) } });
      for (const m of members) idSet.add(m.lockId);
    }
    const ids = Array.from(idSet);

    if (ids.length === 0) {
      return {
        locks: [],
        validFrom: link.validFrom.toISOString(),
        validTo: link.validTo.toISOString(),
        remainingSeconds: Math.max(0, Math.floor((link.validTo.getTime() - now.getTime()) / 1000)),
      };
    }

    const found = await this.locks.find({
      where: { id: In(ids), active: true },
      order: { name: 'ASC' },
      select: ['id', 'name', 'active'], // minimal payload
    });

    const items = found.map((l) => ({ id: l.id, name: l.name }));

    return {
      locks: items,
      validFrom: link.validFrom.toISOString(),
      validTo: link.validTo.toISOString(),
      remainingSeconds: Math.max(0, Math.floor((link.validTo.getTime() - now.getTime()) / 1000)),
    };
  }

  private async resolveAllowedLockIds(explicitLockIds: string[] = [], groupIds: string[] = []) {
    const set = new Set<string>(explicitLockIds);
    if (groupIds.length > 0) {
      const groupMembers = await this.members.find({ where: { groupId: In(groupIds) }, select: ['lockId'] });
      for (const m of groupMembers) set.add(m.lockId);
    }
    return Array.from(set.values());
  }

  private async audit(
    accessLinkId: string,
    lockId: string,
    action: 'OPEN' | 'STATUS',
    result: 'SUCCESS' | 'FAILED',
    message: string | undefined,
    req: any,
    traceOrSwipe?: string,
    lock?: LockEntityDB,
  ) {
    const ev = this.events.create({
      accessLinkId,
      lockId,
      action,
      providerType: lock?.providerType ?? 'UNKNOWN',
      result,
      message,
      ip: this.getIp(req),
      userAgent: req?.headers?.['user-agent'],
      traceId: traceOrSwipe,
    });
    await this.events.save(ev);
  }

  private getIp(req: any): string | undefined {
    return (
      req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req?.ip ||
      req?.socket?.remoteAddress ||
      undefined
    );
  }
}
