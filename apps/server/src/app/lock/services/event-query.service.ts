import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { AccessEvent } from '../entities/access-event.entity';
import { EventsQueryDto } from '../dto/events.query.dto';

@Injectable()
export class EventQueryService {
  constructor(@InjectRepository(AccessEvent) private repo: Repository<AccessEvent>) {}

  async query(q: EventsQueryDto) {
    const where: any = {};
    if (q.lockId) where['lockId'] = q.lockId;
    if (q.linkId) where['accessLinkId'] = q.linkId;
    if (q.result) where['result'] = q.result;
    if (q.from && q.to) where['createdAt'] = Between(new Date(q.from), new Date(q.to));
    else if (q.from) where['createdAt'] = MoreThanOrEqual(new Date(q.from));
    else if (q.to) where['createdAt'] = LessThanOrEqual(new Date(q.to));
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }
}
