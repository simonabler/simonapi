import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { WatermarkController } from './watermark.controller';
import { WatermarkService } from './watermark.service';
import { memoryStorage } from 'multer';

@Module({
  imports: [
    // Use in-memory storage so we can pass Buffers directly to sharp
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
    }),
  ],
  controllers: [WatermarkController],
  providers: [WatermarkService],
  exports: [WatermarkService],
})
export class WatermarkModule {}

