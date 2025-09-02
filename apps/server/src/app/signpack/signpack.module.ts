import { Injectable, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule, CronExpression, Cron } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { Signpack } from './entities/signpack.entity';
import { SignpackService } from './signpack.service';
import { SignpackController } from './signpack.controller';



@Injectable()
export class PurgeService {
  constructor(private readonly svc: SignpackService) {}

  @Cron(process.env.PURGE_CRON || CronExpression.EVERY_HOUR)
  async run() {
    try { await this.svc.purgeExpired(); } catch { }
  }
}


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60, limit: 60 }]),
    ScheduleModule.forRoot(),
    HttpModule,
    
    TypeOrmModule.forFeature([Signpack]),
  ],
  controllers: [SignpackController],
  providers: [SignpackService, PurgeService],
})
export class SignpackModule {}

