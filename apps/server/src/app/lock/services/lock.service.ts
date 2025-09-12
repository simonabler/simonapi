import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { LockProviderRegistry } from '../core/lock.registry';
import { LockEntityDB } from '../entities/lock.entity';
import { OpenResult } from '../core/lock.types';

@Injectable()
export class LockService {
  constructor(private readonly registry: LockProviderRegistry) {}

  async open(lock: LockEntityDB): Promise<OpenResult> {
    const traceId = randomUUID();
    const provider = await this.registry.resolve(lock.providerType as any, lock.providerConfig || {});
    // Map DB entity -> provider lock view
    const lockView = { id: lock.id, name: lock.name, providerType: lock.providerType, providerConfig: lock.providerConfig };
    return provider.openLock(lockView, { traceId });
  }
}
