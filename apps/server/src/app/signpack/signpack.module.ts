import { Injectable, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule, CronExpression, Cron } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { ApiKeyModule } from '../api-key/api-key.module';
import { Signpack } from './entities/signpack.entity';
import { SignpackService } from './signpack.service';
import { SignpackController } from './signpack.controller';
import signpackConfig from './config/app.config';


@Injectable()
export class PurgeService {
  constructor(private readonly svc: SignpackService) {}

  @Cron(process.env.PURGE_CRON || CronExpression.EVERY_HOUR)
  async run() {
    try { await this.svc.purgeExpired(); } catch {; }
  }
}


@Module({
  imports: [
    ConfigModule.forFeature(signpackConfig),
    ScheduleModule.forRoot(),
    HttpModule,
    TypeOrmModule.forFeature([Signpack]),
    ApiKeyModule,
  ],
  controllers: [SignpackController],
  providers: [SignpackService, PurgeService],
})
export class SignpackModule {}
