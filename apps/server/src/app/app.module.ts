import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QrModule } from './qr/qr.module';
import { UtilityModule } from './utils/utility.module';
import { ReportsController } from './reports.controller';
import { seconds, ThrottlerModule } from '@nestjs/throttler';
import { BarcodesModule } from './barcode/barcodes.module';
import { SignpackModule } from './signpack/signpack.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';

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
      throttlers: [{ ttl: seconds(60), limit: 60 }],
      // Tracker = Schlüssel je Nutzer: API-Key bevorzugen, sonst IP
      getTracker: (req: any) => req.headers['x-api-key']?.toString().trim() || req.ip,
      // Optional: eigenen Redis-Storage o.ä. einsetzen (siehe unten)
      // storage: ...
    }),
    QrModule,
    BarcodesModule,
    SignpackModule,
    UtilityModule,
  ],
  controllers: [AppController, ReportsController],
  providers: [AppService],
})
export class AppModule {}
