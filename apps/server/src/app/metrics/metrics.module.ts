import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsService } from './metrics.service';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsController } from './metrics.controller';
import { BlocklistService } from './blocklist.service';
import { AnomalyDetectorService } from './anomaly-detector.service';
import { AnomalyGuard } from './anomaly.guard';
import { VisitorService } from './visitor.service';
import { VisitorDailyEntity } from './entities/visitor-daily.entity';
import { MetricMetaEntity } from './entities/metric-meta.entity';
import { MetricRouteEntity } from './entities/metric-route.entity';
import { MetricDailyEntity } from './entities/metric-daily.entity';
import { SecurityBlockEntity } from './entities/security-block.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MetricMetaEntity, MetricRouteEntity, MetricDailyEntity, SecurityBlockEntity, VisitorDailyEntity]),
  ],
  providers: [
    MetricsService,
    BlocklistService,
    AnomalyDetectorService,
    VisitorService,
    Reflector,
    { provide: APP_GUARD, useClass: AnomalyGuard },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
  controllers: [MetricsController],
  exports: [MetricsService, BlocklistService, VisitorService],
})
export class MetricsModule {}
