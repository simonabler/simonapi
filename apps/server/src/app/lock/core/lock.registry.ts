import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { LockProvider, LockProviderType } from './lock.types';
import { WebhookProvider } from '../providers/webhook.provider';
import { DbProvider } from '../providers/db.provider';
//import { RabbitMqProvider } from '../providers/rabbitmq.provider';

type ProviderCtor = new (...args: any[]) => LockProvider;

@Injectable()
export class LockProviderRegistry {
  private readonly map = new Map<LockProviderType, ProviderCtor>([
    [LockProviderType.WEBHOOK, WebhookProvider],
    [LockProviderType.DB, DbProvider],
 //   [LockProviderType.RABBITMQ, RabbitMqProvider],
  ]);

  constructor(private readonly moduleRef: ModuleRef) {}

  async resolve(type: LockProviderType, config: Record<string, any>): Promise<LockProvider> {
    const ctor = this.map.get(type);
    if (!ctor) throw new Error(`Unsupported provider type: ${type}`);
    const instance = await this.moduleRef.create(ctor);
    await instance.configure(config);
    return instance;
  }

  register(type: LockProviderType, ctor: ProviderCtor) {
    if (this.map.has(type)) throw new Error(`Provider for type ${type} already registered`);
    this.map.set(type, ctor);
  }
}
