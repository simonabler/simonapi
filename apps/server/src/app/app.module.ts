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
import { ConfigModule, ConfigService } from '@nestjs/config';
import appConfig from './config/app.config';
//dummyload for NX project.json
import {} from 'sqlite3'
import { APP_GUARD } from '@nestjs/core';
import { LockModule } from './lock/lock.module';
import databaseConfig from './config/database.config';
import throttlerConfig from './config/throttler.config';
import { MetricsModule } from './metrics/metrics.module';
import { CryptoModule } from './crypto/crypto.module';

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
    ConfigModule.forFeature(databaseConfig),
    ConfigModule.forFeature(throttlerConfig),
    
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const db = cfg.get<any>('database');
        if (db?.url) {
          const options: any = {
            type: 'postgres' as const,
            url: db.url,
            autoLoadEntities: true,
            synchronize: db.synchronize !== false,
          };
          if (db.ssl) {
            options.ssl = { rejectUnauthorized: db.sslRejectUnauthorized !== false };
          }
          return options;
        }
        if (db?.host) {
          const options: any = {
            type: 'postgres' as const,
            host: db.host,
            port: db.port ?? 5432,
            username: db.username ?? undefined,
            password: db.password ?? undefined,
            database: db.database ?? undefined,
            autoLoadEntities: true,
            synchronize: db.synchronize !== false,
          };
          if (db.ssl) {
            options.ssl = { rejectUnauthorized: db.sslRejectUnauthorized !== false };
          }
          return options;
        }
        return {
          type: 'sqlite' as const,
          database: db?.sqlitePath ?? process.env.TYPEORM_DB ?? './signpacks.sqlite',
          autoLoadEntities: true,
          synchronize: db?.synchronize !== false,
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
    CryptoModule,
    SignpackModule,
    WatermarkModule,
    UtilityModule,
    LockModule,
    MetricsModule
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
