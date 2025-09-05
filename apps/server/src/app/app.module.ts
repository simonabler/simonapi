import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QrModule } from './qr/qr.module';
import { UtilityModule } from './utils/utility.module';
import { ReportsController } from './reports.controller';
import { seconds, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { WatermarkModule } from './watermark/watermark.module';
import { BarcodesModule } from './barcode/barcodes.module';
import { SignpackModule } from './signpack/signpack.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';
//dummyload for NX project.json
import {} from 'sqlite3'
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV ?? ''}`.replace(/\.$/, ''),
        '.env.local',
        '.env',
      ],
      load: [appConfig],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const url = process.env.TYPEORM_URL;
        if (url) {
          return {
            type: 'postgres' as const,
            url,
            autoLoadEntities: true,
            synchronize: true,
          };
        }
        return {
          type: 'sqlite' as const,
          database: process.env.TYPEORM_DB ?? './signpacks.sqlite',
          autoLoadEntities: true,
          synchronize: true,
        };
      },
    }),
    ThrottlerModule.forRoot({
      // v5+: mehrere „throttlers“ möglich; ttl in **Millisekunden**
      throttlers: [{ ttl: seconds(60), limit: 100 }],
      // Tracker = Schlüssel je Nutzer: API-Key bevorzugen, sonst IP
      getTracker: (req: any) => req.headers['x-api-key']?.toString().trim() || req.ip,
      // Optional: eigenen Redis-Storage o.ä. einsetzen (siehe unten)
      // storage: ...
    }),
    QrModule,
    BarcodesModule,
    SignpackModule,
    WatermarkModule,
    UtilityModule,
  ],
  controllers: [AppController, ReportsController],
  providers: [AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ],
})
export class AppModule {}
