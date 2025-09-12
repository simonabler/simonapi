import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LockEntityDB } from './entities/lock.entity';
import { LockGroup } from './entities/lock-group.entity';
import { LockGroupMember } from './entities/lock-group.member.entity';
import { AccessLink } from './entities/access-link.entity';
import { AccessEvent } from './entities/access-event.entity';

import { LockAdminService } from './services/lock-admin.service';
import { LockGroupService } from './services/lock-group.service';
import { AccessLinkService } from './services/access-link.service';
import { EventQueryService } from './services/event-query.service';
import { LockService } from './services/lock.service';

import { AdminLockController } from './controllers/admin-lock.controller';
import { AdminLockGroupController } from './controllers/admin-lock-group.controller';
import { AdminAccessLinkController } from './controllers/admin-access-link.controller';
import { AdminEventsController } from './controllers/admin-events.controller';
import { LockController } from './lock.controller';

import { LockProviderModule } from './lock-provider.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LockEntityDB, LockGroup, LockGroupMember, AccessLink, AccessEvent]),
    LockProviderModule,
  ],
  providers: [LockAdminService, LockGroupService, AccessLinkService, EventQueryService, LockService],
  controllers: [AdminLockController, AdminLockGroupController, AdminAccessLinkController, AdminEventsController, LockController],
  exports: [LockService],
})
export class LockModule {}
