import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QrModule } from './qr/qr.module';
import { UtilityModule } from './utils/utility.module';
import { ReportsController } from './reports.controller';
import { WatermarkModule } from './watermark/watermark.module';
import { BarcodesModule } from './barcode/barcodes.module';
import { SignpackModule } from './signpack/signpack.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import appConfig from './config/app.config';
//dummyload for NX project.json
import {} from 'sqlite3'
import { LockModule } from './lock/lock.module';
import databaseConfig from './config/database.config';
import { MetricsModule } from './metrics/metrics.module';
import { CryptoModule } from './crypto/crypto.module';
import { ApiKeyModule } from './api-key/api-key.module';
import { UsageModule } from './usage/usage.module';

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
    QrModule,
    BarcodesModule,
    CryptoModule,
    SignpackModule,
    WatermarkModule,
    UtilityModule,
    LockModule,
    MetricsModule,
    ApiKeyModule,
    // Rate limiting — applies to every request via APP_INTERCEPTOR.
    // Anonymous callers (no valid API key) get the defaultRule.
    // Authenticated callers get TIER_LIMITS from ApiKeyService (applied
    // per-request in UsageInterceptor via overrideRule — no global mutation).
    UsageModule.forRoot({
      adminToken: process.env.ADMIN_TOKEN,
      defaultRule: {
        perMinute: 10,   // anonymous / free tier fallback
      },
    }),
  ],
  controllers: [AppController, ReportsController],
  providers: [AppService],
})
export class AppModule {}
