import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccessLink } from '../entities/access-link.entity';
import { CreateAccessLinkDto } from '../dto/access-link.dto';
import { genSlug, genToken, sha256 } from '../util/token.util';

@Injectable()
export class AccessLinkService {
  constructor(@InjectRepository(AccessLink) private repo: Repository<AccessLink>) {}

  async create(dto: CreateAccessLinkDto, opts: { baseUrl: string; createdByUserId?: string }) {
    const from = new Date(dto.validFrom);
    const to = new Date(dto.validTo);
    if (!(from < to)) throw new BadRequestException('validFrom must be before validTo');

    const slug = await this.uniqueSlug();
    const token = genToken(24);
    const tokenHash = sha256(token);

    let pin: string | undefined;
    let pinHash: string | undefined;
    if (dto.requirePin) {
      pin = (Math.floor(1000 + Math.random() * 9000)).toString();
      pinHash = sha256(pin);
    }

    const link = this.repo.create({
      slug,
      tokenHash,
      pinHash,
      validFrom: from,
      validTo: to,
      allowedLockIds: dto.allowedLockIds ?? [],
      allowedGroupIds: dto.allowedGroupIds ?? [],
      maxUses: dto.maxUses,
      requirePin: !!dto.requirePin,
      note: dto.note,
      createdByUserId: opts.createdByUserId,
      revoked: false,
      usedCount: 0,
    });
    await this.repo.save(link);

    const shareUrl = `${opts.baseUrl.replace(/\/$/, '')}/lock/${slug}?t=${token}`;
    return { shareUrl, pin };
  }

  findAll() { return this.repo.find({ order: { createdAt: 'DESC' } }); }

  async update(id: string, patch: Partial<Pick<AccessLink, 'validFrom'|'validTo'|'revoked'|'maxUses'>>) {
    const link = await this.repo.findOne({ where: { id } });
    if (!link) throw new BadRequestException('AccessLink not found');
    Object.assign(link, patch);
    return this.repo.save(link);
  }

  private async uniqueSlug(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const s = genSlug(6);
      const exists = await this.repo.findOne({ where: { slug: s } });
      if (!exists) return s;
    }
    for (let i = 0; i < 5; i++) {
      const s = genSlug(10);
      const exists = await this.repo.findOne({ where: { slug: s } });
      if (!exists) return s;
    }
    throw new Error('Failed to generate unique slug');
  }
}
