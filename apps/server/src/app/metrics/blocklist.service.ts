import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecurityBlockEntity } from './entities/security-block.entity';

export interface BlockEntry {
  ip: string;
  until: number; // epoch ms
  reason: string;
  strikes: number;
  meta?: Record<string, any>;
}

@Injectable()
export class BlocklistService implements OnModuleInit {
  private readonly log = new Logger(BlocklistService.name);
  private readonly blocks = new Map<string, BlockEntry>();

  constructor(
    @InjectRepository(SecurityBlockEntity)
    private readonly repo: Repository<SecurityBlockEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    const rows = await this.repo.find();
    const now = Date.now();
    for (const row of rows) {
      const untilMs = row.until.getTime();
      if (untilMs > now) {
        this.blocks.set(row.ip, {
          ip: row.ip,
          until: untilMs,
          reason: row.reason,
          strikes: row.strikes,
          meta: row.meta ?? undefined,
        });
      } else {
        await this.repo.delete({ ip: row.ip });
      }
    }
  }

  isBlocked(ip: string) {
    const now = Date.now();
    const entry = this.blocks.get(ip);
    if (!entry) {
      return { blocked: false as const };
    }
    if (entry.until <= now) {
      this.blocks.delete(ip);
      void this.repo.delete({ ip }).catch((err) => {
        this.log.error(`Failed to delete expired block entry for ${ip}`, err instanceof Error ? err.stack : String(err));
      });
      return { blocked: false as const };
    }
    return {
      blocked: true as const,
      remainingMs: entry.until - now,
      entry,
    };
  }

  /** Escalating ban durations: 1)5m 2)30m 3)2h 4)24h 5)7d */
  private durationForStrike(strikes: number) {
    const table = [5, 30, 120, 1440, 10080]; // Minutes
    const idx = Math.min(strikes - 1, table.length - 1);
    return table[idx] * 60 * 1000;
  }

  ban(ip: string, reason: string, meta?: Record<string, any>) {
    const prev = this.blocks.get(ip);
    const strikes = (prev?.strikes ?? 0) + 1;
    const durationMs = this.durationForStrike(strikes);
    const until = Date.now() + durationMs;
    const entry: BlockEntry = { ip, until, reason, strikes, meta };
    this.blocks.set(ip, entry);

    const entity = this.repo.create({
      ip,
      reason,
      strikes,
      until: new Date(until),
      meta: meta ?? null,
    });
    void this.repo.save(entity).catch((err) => {
      this.log.error(`Failed to persist block entry for ${ip}`, err instanceof Error ? err.stack : String(err));
    });

    return entry;
  }

  unban(ip: string) {
    const existed = this.blocks.delete(ip);
    void this.repo.delete({ ip }).catch((err) => {
      this.log.error(`Failed to remove block entry for ${ip}`, err instanceof Error ? err.stack : String(err));
    });
    return existed;
  }

  list() {
    const now = Date.now();
    return Array.from(this.blocks.values())
      .filter((b) => b.until > now)
      .map((b) => ({ ...b, remainingMs: b.until - now }));
  }

  async clear() {
    this.blocks.clear();
    await this.repo.clear();
  }
}
