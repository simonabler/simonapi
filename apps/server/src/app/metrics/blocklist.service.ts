import { Injectable } from '@nestjs/common';

export interface BlockEntry {
  ip: string;
  until: number; // epoch ms
  reason: string;
  strikes: number;
  meta?: Record<string, any>;
}

@Injectable()
export class BlocklistService {
  private readonly blocks = new Map<string, BlockEntry>();

  isBlocked(ip: string) {
    const now = Date.now();
    const e = this.blocks.get(ip);
    if (!e) return { blocked: false as const };
    if (e.until <= now) {
      this.blocks.delete(ip);
      return { blocked: false as const };
    }
    return { blocked: true as const, remainingMs: e.until - now, entry: e };
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
    return entry;
  }

  unban(ip: string) {
    return this.blocks.delete(ip);
  }

  list() {
    const now = Date.now();
    return Array.from(this.blocks.values())
      .filter(b => b.until > now)
      .map(b => ({ ...b, remainingMs: b.until - now }));
  }

  clear() {
    this.blocks.clear();
  }
}
