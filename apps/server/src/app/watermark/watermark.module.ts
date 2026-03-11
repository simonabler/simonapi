import { Module } from '@nestjs/common';
import { ApiKeyModule } from '../api-key/api-key.module';
import { MulterModule } from '@nestjs/platform-express';
import { WatermarkController } from './watermark.controller';
import { WatermarkService } from './watermark.service';
import { memoryStorage } from 'multer';

@Module({
  imports: [
    ApiKeyModule,
    // Use in-memory storage so we can pass Buffers directly to sharp
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB — matches FileFieldsInterceptor limit
    }),
  ],
  controllers: [WatermarkController],
  providers: [WatermarkService],
  exports: [WatermarkService],
})
export class WatermarkModule {}

