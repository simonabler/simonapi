import { Injectable, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule, CronExpression, Cron } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { Signpack } from './entities/signpack.entity';
import { SignpackService } from './signpack.service';
import { SignpackController } from './signpack.controller';
import signpackConfig from './config/app.config';
import databaseConfig from './config/database.config';
import throttlerConfig from './config/throttler.config';



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
    ConfigModule.forFeature(signpackConfig),
    ConfigModule.forFeature(databaseConfig),
    ConfigModule.forFeature(throttlerConfig),
    ScheduleModule.forRoot(),
    HttpModule,
    TypeOrmModule.forFeature([Signpack]),
  ],
  controllers: [SignpackController],
  providers: [SignpackService, PurgeService],
})
export class SignpackModule {}
