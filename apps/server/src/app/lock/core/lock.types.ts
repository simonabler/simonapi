export enum LockProviderType {
  WEBHOOK = 'WEBHOOK',
  DB = 'DB',
  RABBITMQ = 'RABBITMQ',
}

export interface LockEntity {
  id: string;
  name: string;
  providerType: LockProviderType;
  providerConfig: Record<string, any>;
}

export interface OpenResult {
  ok: boolean;
  detail?: any;
}

export interface LockProvider {
  readonly type: LockProviderType;
  configure(config: Record<string, any>): Promise<void> | void;
  openLock(lock: LockEntity, opts: { traceId: string }): Promise<OpenResult>;
  getStatus?(lock: LockEntity): Promise<{ state: 'OPEN' | 'CLOSED' | 'UNKNOWN'; detail?: any }>;
}
