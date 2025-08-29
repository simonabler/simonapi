import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QrModule } from './qr/qr.module';
import { UtilityModule } from './utils/utility.module';

@Module({
  imports: [QrModule, UtilityModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
