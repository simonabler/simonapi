import { DynamicModule, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { UsageController } from './usage.controller';
import { UsageInterceptor } from './usage.interceptor';
import { UsageService, USAGE_OPTS } from './usage.service';
import { UsageModuleOptions } from './usage.types';

@Module({})
export class UsageModule {
  static forRoot(options: UsageModuleOptions = {}): DynamicModule {
    return {
      module: UsageModule,
      providers: [
        UsageService,
        { provide: USAGE_OPTS, useValue: options },
        {
          provide: APP_INTERCEPTOR,
          useClass: UsageInterceptor,
        },
      ],
      controllers: [UsageController],
      exports: [UsageService],
    };
  }
}

