import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QrModule } from './qr/qr.module';
import { UtilityModule } from './utils/utility.module';
import { ReportsController } from './reports.controller';
import { seconds, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
  ThrottlerModule.forRoot({
      // v5+: mehrere „throttlers“ möglich; ttl in **Millisekunden**
      throttlers: [{ ttl: seconds(60), limit: 60 }],
      // Tracker = Schlüssel je Nutzer: API-Key bevorzugen, sonst IP
      getTracker: (req: any) => req.headers['x-api-key']?.toString().trim() || req.ip,
      // Optional: eigenen Redis-Storage o.ä. einsetzen (siehe unten)
      // storage: ...
    }),
    QrModule,
    UtilityModule,
  ],
  controllers: [AppController, ReportsController],
  providers: [AppService],
})
export class AppModule {}

