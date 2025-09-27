import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { MetricsService } from './metrics.service';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsController } from './metrics.controller';
import { BlocklistService } from './blocklist.service';
import { AnomalyDetectorService } from './anomaly-detector.service';
import { AnomalyGuard } from './anomaly.guard';

@Module({
  providers: [
    MetricsService,
    BlocklistService,
    AnomalyDetectorService,
    Reflector,
    { provide: APP_GUARD, useClass: AnomalyGuard },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
  controllers: [MetricsController],
  exports: [MetricsService, BlocklistService],
})
export class MetricsModule {}
