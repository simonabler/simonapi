import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LockEntity, LockProvider, LockProviderType, OpenResult } from '../core/lock.types';

@Injectable()
export class DbProvider implements LockProvider {
  readonly type = LockProviderType.DB;
  private cfg!: {
    connectionName: string;
    procedureOrQuery: string;
    paramsTemplate?: Record<string, any>;
  };

  constructor(private readonly defaultDs: DataSource) {}

  configure(config: Record<string, any>) {
    this.cfg = {
      connectionName: config.connectionName ?? 'default',
      procedureOrQuery: config.procedureOrQuery,
      paramsTemplate: config.paramsTemplate ?? {},
    };
  }

  async openLock(lock: LockEntity, opts: { traceId: string }): Promise<OpenResult> {
    const ds = this.defaultDs;
    const params = { ...(this.cfg.paramsTemplate || {}), lockId: lock.id, traceId: opts.traceId };
    const query = this.cfg.procedureOrQuery;
    try {
      const result = await ds.query(query, Object.values(params));
      return { ok: true, detail: result };
    } catch (e: any) {
      return { ok: false, detail: e?.message };
    }
  }
}
