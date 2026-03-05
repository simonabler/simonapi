import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SsccCounterEntity } from './sscc-counter.entity';
import { buildSscc, SsccBuildResult } from './sscc';

@Injectable()
export class SsccService {

  constructor(
    @InjectRepository(SsccCounterEntity)
    private readonly counters: Repository<SsccCounterEntity>,
  ) {}

  /**
   * Returns the next serial reference for the given prefix key,
   * atomically incrementing the persisted counter.
   *
   * Uses optimistic locking — retries once on version conflict.
   */
  async nextSerial(extensionDigit: number, companyPrefix: string): Promise<SsccBuildResult> {
    const prefixKey = `${extensionDigit}${companyPrefix}`;

    for (let attempt = 0; attempt < 3; attempt++) {
      let record = await this.counters.findOne({ where: { prefixKey } });

      if (!record) {
        record = this.counters.create({ prefixKey, lastSerial: 0, version: 0 });
      }

      const nextSerial = record.lastSerial + 1;

      try {
        await this.counters.save({ ...record, lastSerial: nextSerial });
      } catch (e: any) {
        // Version conflict — retry
        if (attempt < 2) continue;
        throw new BadRequestException('Counter conflict — please retry');
      }

      return buildSscc({
        extensionDigit,
        companyPrefix,
        serialReference: String(nextSerial),
      });
    }

    throw new BadRequestException('Could not allocate serial after retries');
  }

  /** Returns the current counter state without incrementing. */
  async peekCounter(extensionDigit: number, companyPrefix: string): Promise<{ prefixKey: string; lastSerial: number } | null> {
    const prefixKey = `${extensionDigit}${companyPrefix}`;
    const record = await this.counters.findOne({ where: { prefixKey } });
    if (!record) return null;
    return { prefixKey, lastSerial: record.lastSerial };
  }

  /** Resets the counter for a given prefix key to a specific value (default 0). */
  async resetCounter(extensionDigit: number, companyPrefix: string, to = 0): Promise<void> {
    const prefixKey = `${extensionDigit}${companyPrefix}`;
    await this.counters.upsert(
      { prefixKey, lastSerial: to },
      ['prefixKey'],
    );
  }
}
