import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BarcodesController } from './barcodes.controller';
import { BarcodesService } from './barcodes.service';
import { SsccService } from './sscc.service';
import { SsccCounterEntity } from './sscc-counter.entity';
import { ApiKeyModule } from '../api-key/api-key.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SsccCounterEntity]),
    ApiKeyModule,
  ],
  controllers: [BarcodesController],
  providers: [BarcodesService, SsccService],
  exports: [BarcodesService, SsccService],
})
export class BarcodesModule {}
